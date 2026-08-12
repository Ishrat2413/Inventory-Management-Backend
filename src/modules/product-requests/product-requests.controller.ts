import { Request, Response } from 'express';
import { productRequestServices } from './product-requests.service';
import { RequestSearchQueryInput } from './product-requests.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const createRequest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await productRequestServices.createRequest(req.body, req.user!.id);
  ServerResponse(res, true, 201, 'Product request created successfully', result);
});

export const getRequestById = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await productRequestServices.getRequestById(req.params.id as string, req.user!);
  ServerResponse(res, true, 200, 'Product request retrieved successfully', result);
});

export const getManyRequest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const query = req.query as unknown as RequestSearchQueryInput;
  const { requests, totalData, totalPages } = await productRequestServices.getManyRequest(query, req.user!);
  ServerResponse(res, true, 200, 'Product requests retrieved successfully', { requests, totalData, totalPages });
});

export const updateRequestStatus = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await productRequestServices.updateRequestStatus(req.params.id as string, req.body, req.user!.id);
  ServerResponse(res, true, 200, `Request ${result.status.toLowerCase()} successfully`, result);
});

export const issueRequest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await productRequestServices.issueRequest(req.params.id as string, req.user!.id);
  ServerResponse(res, true, 200, 'Request issued successfully', result);
});

export const getBOMPreview = catchAsync(async (req: AuthedRequest, res: Response) => {
  const productId = req.query.productId as string;
  const quantity = Number(req.query.quantity) || 1;
  if (!productId) {
    ServerResponse(res, false, 400, 'productId is required', null);
    return;
  }
  const result = await productRequestServices.getBOMPreview(productId, quantity);
  ServerResponse(res, true, 200, 'BOM preview retrieved successfully', result);
});
