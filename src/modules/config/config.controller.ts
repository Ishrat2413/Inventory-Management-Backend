import { Request, Response } from 'express';
import { configServices } from './config.service';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const getAllConfigs = catchAsync(async (_req: Request, res: Response) => {
  const result = await configServices.getAllConfigs();
  ServerResponse(res, true, 200, 'System configs retrieved successfully', result);
});

export const getConfigByKey = catchAsync(async (req: Request, res: Response) => {
  const result = await configServices.getConfigByKey(req.params.key as string);
  ServerResponse(res, true, 200, 'Config value retrieved successfully', result);
});

export const updateConfigs = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await configServices.updateConfigs(req.body, req.user?.id);
  ServerResponse(res, true, 200, 'System configs updated successfully', result);
});
