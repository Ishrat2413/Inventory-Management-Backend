import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { stockMovementServices } from '../stock-movements/stock-movements.service';
import { getBOMTree } from '../products/bom.util';
import { CreateRequestInput, UpdateRequestStatusInput, RequestSearchQueryInput } from './product-requests.validation';

const requestInclude = {
  product: { select: { id: true, name: true, sku: true, currentStock: true, isComposite: true } },
  task: { select: { id: true, title: true, status: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  stockMovements: { select: { id: true } },
};

/**
 * Builds a BOM snapshot for a refill request.
 * Stores the full BOM structure at request-creation time so historical requests
 * remain accurate even after BOM changes.
 */
const buildBOMSnapshot = async (productId: string, quantity: number) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;

  if (!product.isComposite) return null;

  const bomTree = await getBOMTree(productId, 0);

  const flattenComponents = (node: any, multiplier: number): any[] => {
    const components: any[] = [];
    for (const child of node.children) {
      const totalQty = Number(child.quantityRequired) * multiplier;
      components.push({
        productId: child.productId,
        name: child.name,
        sku: child.sku,
        quantityRequiredPerUnit: Number(child.quantityRequired),
        totalQuantityRequired: totalQty,
        unitPrice: Number(child.unitPrice ?? 0),
      });
    }
    return components;
  };

  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    isComposite: true,
    quantity,
    bomComponents: flattenComponents(bomTree, quantity),
  };
};

/**
 * Returns a live BOM preview for a product + quantity combination.
 * Used by the frontend to show the employee what components will be requested.
 */
const getBOMPreview = async (productId: string, quantity: number) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  if (!product.isComposite) {
    return { isComposite: false, product: { id: product.id, name: product.name, sku: product.sku }, quantity, components: [] };
  }

  const bomTree = await getBOMTree(productId, 0);

  const flattenComponents = (node: any, multiplier: number): any[] => {
    const components: any[] = [];
    for (const child of node.children) {
      const totalQty = Number(child.quantityRequired) * multiplier;
      components.push({
        productId: child.productId,
        name: child.name,
        sku: child.sku,
        quantityRequiredPerUnit: Number(child.quantityRequired),
        totalQuantityRequired: totalQty,
      });
      // If child is also composite, recurse
      if (child.isComposite && child.children?.length > 0) {
        components.push(...flattenComponents(child, totalQty));
      }
    }
    return components;
  };

  return {
    isComposite: true,
    product: { id: product.id, name: product.name, sku: product.sku },
    quantity,
    components: flattenComponents(bomTree, quantity),
  };
};

/**
 * Creates a product request. Extra requests against an already-completed
 * task are rejected outright (business rule from API_ENDPOINTS.md).
 * Stores a bomSnapshot at creation time for historical accuracy.
 */
const createRequest = async (data: CreateRequestInput, requestedById: string) => {
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw ApiError.notFound('Product not found');
  if (product.isDiscontinued) throw ApiError.badRequest('Cannot request a discontinued product', 'PRODUCT_DISCONTINUED');

  if (data.type === 'TASK_RELATED' && data.taskId) {
    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (!task) throw ApiError.notFound('Task not found');
    if (task.status === 'COMPLETED') {
      throw ApiError.conflict('Cannot request extra products for a task that is already completed', 'TASK_ALREADY_COMPLETED');
    }
  }

  // Store a snapshot of the BOM at request creation for historical accuracy
  const bomSnapshot = await buildBOMSnapshot(data.productId, data.quantity);

  return prisma.productRequest.create({
    data: {
      productId: data.productId,
      quantity: data.quantity,
      type: data.type,
      taskId: data.taskId,
      reason: data.reason,
      requestedById,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(bomSnapshot ? { bomSnapshot: bomSnapshot as any } : {}),
    },
    include: requestInclude,
  });
};

const getRequestById = async (id: string, requester: { id: string; role: string }) => {
  const request = await prisma.productRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) throw ApiError.notFound('Product request not found');
  if (requester.role !== 'ADMIN' && request.requestedById !== requester.id) throw ApiError.forbidden();
  return request;
};

const getManyRequest = async (query: RequestSearchQueryInput, requester: { id: string; role: string }) => {
  const { skip, take, showPerPage } = buildPagination(query);

  const where: Record<string, unknown> = {
    ...(query.status && { status: query.status }),
    ...(query.type && { type: query.type }),
    ...(query.taskId && { taskId: query.taskId }),
    ...(query.requestedBy && { requestedById: query.requestedBy }),
  };

  if (requester.role !== 'ADMIN') where.requestedById = requester.id;

  const [totalData, requests] = await prisma.$transaction([
    prisma.productRequest.count({ where }),
    prisma.productRequest.findMany({ where, skip, take, include: requestInclude, orderBy: { createdAt: 'desc' } }),
  ]);

  return { requests, totalData, totalPages: totalPagesOf(totalData, showPerPage) };
};

/** Admin approves or rejects a PENDING request. Decisions are final (no re-deciding). */
const updateRequestStatus = async (id: string, data: UpdateRequestStatusInput, approvedById: string) => {
  const request = await prisma.productRequest.findUnique({ where: { id } });
  if (!request) throw ApiError.notFound('Product request not found');
  if (request.status !== 'PENDING') throw ApiError.conflict('This request has already been decided', 'REQUEST_ALREADY_DECIDED');

  return prisma.productRequest.update({
    where: { id },
    data: {
      status: data.status,
      rejectionReason: data.status === 'REJECTED' ? data.rejectionReason : null,
      approvedById,
    },
    include: requestInclude,
  });
};

/**
 * Issues an APPROVED request's quantity — creates CONSUMPTION stock
 * movements (auto-exploding BOM if the product is composite) linked back to
 * this request. A request can only be issued once (duplicate guard).
 */
const issueRequest = async (id: string, performedById: string) => {
  const request = await prisma.productRequest.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!request) throw ApiError.notFound('Product request not found');
  if (request.status !== 'APPROVED') throw ApiError.conflict('Only approved requests can be issued', 'REQUEST_NOT_APPROVED');

  const alreadyIssued = await prisma.stockMovement.findFirst({ where: { relatedRequestId: id } });
  if (alreadyIssued) throw ApiError.conflict('This request has already been issued', 'REQUEST_ALREADY_ISSUED');

  let result;
  if (request.product.isComposite) {
    // For compound products: assemble them (BOM explosion component consumption + parent assembly stock increment)
    result = await stockMovementServices.assembleProduct(
      {
        productId: request.productId,
        quantity: Number(request.quantity),
        notes: `Assembled for refill request ${id}`,
      },
      performedById,
      id,
    );
  } else {
    // For simple products: restock/purchase them (direct positive stock increment)
    result = await stockMovementServices.createMovement(
      {
        productId: request.productId,
        type: 'PURCHASE',
        quantity: Number(request.quantity),
        unitCost: Number(request.product.unitPrice),
        notes: `Purchased/Restocked for refill request ${id}`,
      },
      performedById,
      id,
    );
  }

  return { request, ...result };
};

export const productRequestServices = { createRequest, getRequestById, getManyRequest, updateRequestStatus, issueRequest, getBOMPreview };
