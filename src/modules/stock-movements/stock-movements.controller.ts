import { Request, Response } from 'express';
import { stockMovementServices } from './stock-movements.service';
import { MovementSearchQueryInput } from './stock-movements.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const createMovement = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await stockMovementServices.createMovement(req.body, req.user?.id);
  ServerResponse(res, true, 201, 'Stock movement recorded successfully', result);
});

export const consumeProduct = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await stockMovementServices.consumeProduct(req.body, req.user?.id);
  ServerResponse(res, true, 201, 'Product consumed successfully', result);
});

export const assembleProduct = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await stockMovementServices.assembleProduct(req.body, req.user?.id);
  ServerResponse(res, true, 201, 'Compound product assembled successfully', result);
});

export const getManyMovement = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as MovementSearchQueryInput;
  const { movements, totalData, totalPages } = await stockMovementServices.getManyMovement(query);
  ServerResponse(res, true, 200, 'Stock movements retrieved successfully', { movements, totalData, totalPages });
});

export const getMovementsForProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await stockMovementServices.getMovementsForProduct(req.params.productId as string);
  ServerResponse(res, true, 200, 'Product movement history retrieved successfully', result);
});
