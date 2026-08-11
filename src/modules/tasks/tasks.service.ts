import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { explodeBOM, getBOMTree } from '../products/bom.util';
import { maybeFlagNegativeStock } from '../products/products.service';
import { CreateTaskInput, UpdateTaskInput, AssignTaskInput, TaskSearchQueryInput } from './tasks.validation';

const buildProductsSnapshot = async (requiredProducts: { productId: string; quantity: number }[], db = prisma) => {
  const snapshot: any[] = [];
  for (const item of requiredProducts) {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;

    const itemSnapshot: any = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice: Number(product.unitPrice),
      currency: product.currency,
      isComposite: product.isComposite,
      bomComponents: []
    };

    if (product.isComposite) {
      const bomTree = await getBOMTree(product.id, 0, db);
      const flattenComponents = (node: any, multiplier: number) => {
        const components: any[] = [];
        for (const child of node.children) {
          const totalQty = Number(child.quantityRequired) * multiplier;
          components.push({
            childProductId: child.productId,
            name: child.name,
            sku: child.sku,
            quantityRequiredPerUnit: Number(child.quantityRequired),
            totalQuantityRequired: totalQty,
            unitPrice: Number(child.unitPrice ?? 0)
          });
        }
        return components;
      };
      itemSnapshot.bomComponents = flattenComponents(bomTree, item.quantity);
    }

    snapshot.push(itemSnapshot);
  }
  return snapshot;
};

const taskInclude = {
  assignments: { include: { employee: { select: { id: true, name: true, email: true } } } },
  requiredProducts: { include: { product: { select: { id: true, name: true, sku: true } } } },
  createdBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
};

const createTask = async (data: CreateTaskInput, createdById: string) => {
  const productsSnapshot = await buildProductsSnapshot(data.requiredProducts);
  return prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      createdById,
      productsSnapshot,
      assignments: { createMany: { data: data.assignedEmployeeIds.map((employeeId) => ({ employeeId })) } },
      requiredProducts: { createMany: { data: data.requiredProducts.map((p) => ({ productId: p.productId, quantity: p.quantity })) } },
    } as any,
    include: taskInclude,
  });
};

const updateTask = async (id: string, data: UpdateTaskInput) => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw ApiError.notFound('Task not found');
  if (task.status === 'COMPLETED') throw ApiError.conflict('Completed tasks cannot be edited', 'TASK_ALREADY_COMPLETED');

  const updateData: any = { ...data };
  if (data.status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
    updateData.startedAt = new Date();
  }

  return prisma.task.update({ where: { id }, data: updateData, include: taskInclude });
};

const getTaskById = async (id: string) => {
  const task = await prisma.task.findUnique({ where: { id }, include: { ...taskInclude, productRequests: true } });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
};

const getManyTask = async (query: TaskSearchQueryInput, requester: { id: string; role: string }) => {
  const { skip, take, showPerPage } = buildPagination(query);

  const where: Record<string, unknown> = {
    ...(query.status && { status: query.status }),
    ...(query.createdBy && { createdById: query.createdBy }),
    ...(query.assigneeId && { assignments: { some: { employeeId: query.assigneeId } } }),
  };

  // Employees may only see tasks they created or are assigned to.
  if (requester.role !== 'ADMIN') {
    where.OR = [{ createdById: requester.id }, { assignments: { some: { employeeId: requester.id } } }];
  }

  const [totalData, tasks] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({ where, skip, take, include: taskInclude, orderBy: { createdAt: 'desc' } }),
  ]);

  return { tasks, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

const assignEmployees = async (id: string, data: AssignTaskInput) => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw ApiError.notFound('Task not found');

  await prisma.$transaction([
    ...(data.addEmployeeIds.length
      ? [
          prisma.taskAssignment.createMany({
            data: data.addEmployeeIds.map((employeeId) => ({ taskId: id, employeeId })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(data.removeEmployeeIds.length
      ? [prisma.taskAssignment.deleteMany({ where: { taskId: id, employeeId: { in: data.removeEmployeeIds } } })]
      : []),
  ]);

  return prisma.task.findUnique({ where: { id }, include: taskInclude });
};

const getTaskRequests = async (id: string) => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw ApiError.notFound('Task not found');
  return prisma.productRequest.findMany({ where: { taskId: id }, include: { product: true, requestedBy: { select: { id: true, name: true } } } });
};

/**
 * Marks a task as completed and auto-deducts stock for:
 * 1. The task's originally required products (with BOM explosion), and
 * 2. Any APPROVED extra product requests linked to this task.
 *
 * Business rule (API_ENDPOINTS.md): "Task completion deduction — Deducts
 * original required + all approved extra requests."
 */
const completeTask = async (id: string, completedById: string) => {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id },
      include: { requiredProducts: true, productRequests: { where: { status: 'APPROVED' } } },
    });
    if (!task) throw ApiError.notFound('Task not found');
    if (task.status === 'COMPLETED') throw ApiError.conflict('Task is already completed', 'TASK_ALREADY_COMPLETED');
    if (task.status === 'CANCELLED') throw ApiError.conflict('Cancelled tasks cannot be completed', 'TASK_CANCELLED');

    const consumptionLines: { productId: string; quantity: number; relatedRequestId?: string }[] = [
      ...task.requiredProducts.map((rp) => ({ productId: rp.productId, quantity: Number(rp.quantity) })),
      ...task.productRequests.map((pr) => ({ productId: pr.productId, quantity: Number(pr.quantity), relatedRequestId: pr.id })),
    ];

    for (const line of consumptionLines) {
      const explodedLines = await explodeBOM(line.productId, line.quantity, 0, tx);

      for (const leaf of explodedLines) {
        const totalCost = Number((leaf.quantity * leaf.unitPrice).toFixed(2));
        await tx.stockMovement.create({
          data: {
            productId: leaf.productId,
            type: 'CONSUMPTION',
            quantity: -leaf.quantity,
            unitCost: leaf.unitPrice,
            totalCost,
            relatedTaskId: id,
            relatedRequestId: line.relatedRequestId,
            performedById: completedById,
            notes: `Auto-deducted on completion of task ${task.title}`,
          },
        });
        const updated = await tx.product.update({ where: { id: leaf.productId }, data: { currentStock: { decrement: leaf.quantity } } });
        await maybeFlagNegativeStock(leaf.productId, Number(updated.currentStock), tx);
      }
    }

    // If task was never explicitly started, backfill startedAt to createdAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(task as any).startedAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.task.update({ where: { id }, data: { startedAt: task.createdAt } as any });
    }

    return tx.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedById,
        completedAt: new Date(),
      },
      include: taskInclude,
    });
  }, { timeout: 30000 });
};

export const taskServices = { createTask, updateTask, getTaskById, getManyTask, assignEmployees, getTaskRequests, completeTask };
