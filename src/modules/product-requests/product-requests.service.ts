import prisma from '../../utils/prisma/prisma-client';
import ApiError from '../../utils/errors/api-error';
import { buildPagination, totalPagesOf } from '../../helpers/pagination';
import { stockMovementServices } from '../stock-movements/stock-movements.service';
import { CreateRequestInput, UpdateRequestStatusInput, RequestSearchQueryInput } from './product-requests.validation';

const requestInclude = {
  product: { select: { id: true, name: true, sku: true, currentStock: true } },
  task: { select: { id: true, title: true, status: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
};

/**
 * Creates a product request. Extra requests against an already-completed
 * task are rejected outright (business rule from API_ENDPOINTS.md).
 */
const createRequest = async (data: CreateRequestInput, requestedById: string) => {
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw ApiError.notFound('Product not found');

  if (data.type === 'TASK_RELATED' && data.taskId) {
    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (!task) throw ApiError.notFound('Task not found');
    if (task.status === 'COMPLETED') {
      throw ApiError.conflict('Cannot request extra products for a task that is already completed', 'TASK_ALREADY_COMPLETED');
    }
  }

  return prisma.productRequest.create({
    data: {
      productId: data.productId,
      quantity: data.quantity,
      type: data.type,
      taskId: data.taskId,
      reason: data.reason,
      requestedById,
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
 * Issues an APPROVED request's quantity — creates a CONSUMPTION stock
 * movement (auto-exploding BOM if the product is composite) linked back to
 * this request. A request can only be issued once.
 */
const issueRequest = async (id: string, performedById: string) => {
  const request = await prisma.productRequest.findUnique({ where: { id } });
  if (!request) throw ApiError.notFound('Product request not found');
  if (request.status !== 'APPROVED') throw ApiError.conflict('Only approved requests can be issued', 'REQUEST_NOT_APPROVED');

  const alreadyIssued = await prisma.stockMovement.findFirst({ where: { relatedRequestId: id } });
  if (alreadyIssued) throw ApiError.conflict('This request has already been issued', 'REQUEST_ALREADY_ISSUED');

  const result = await stockMovementServices.consumeProduct(
    { productId: request.productId, quantity: Number(request.quantity), relatedTaskId: request.taskId ?? undefined, notes: `Issued for request ${id}` },
    performedById,
    id,
  );

  return { request, ...result };
};

export const productRequestServices = { createRequest, getRequestById, getManyRequest, updateRequestStatus, issueRequest };
