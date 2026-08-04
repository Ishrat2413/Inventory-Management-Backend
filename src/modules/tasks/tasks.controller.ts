import { Request, Response } from 'express';
import { taskServices } from './tasks.service';
import { TaskSearchQueryInput } from './tasks.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const createTask = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await taskServices.createTask(req.body, req.user!.id);
  ServerResponse(res, true, 201, 'Task created successfully', result);
});

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.updateTask(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'Task updated successfully', result);
});

export const getTaskById = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.getTaskById(req.params.id as string);
  ServerResponse(res, true, 200, 'Task retrieved successfully', result);
});

export const getManyTask = catchAsync(async (req: AuthedRequest, res: Response) => {
  const query = req.query as unknown as TaskSearchQueryInput;
  const { tasks, totalData, totalPages } = await taskServices.getManyTask(query, req.user!);
  ServerResponse(res, true, 200, 'Tasks retrieved successfully', { tasks, totalData, totalPages });
});

export const assignEmployees = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.assignEmployees(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'Task assignments updated successfully', result);
});

export const getTaskRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await taskServices.getTaskRequests(req.params.id as string);
  ServerResponse(res, true, 200, 'Task requests retrieved successfully', result);
});

export const completeTask = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await taskServices.completeTask(req.params.id as string, req.user!.id);
  ServerResponse(res, true, 200, 'Task completed successfully', result);
});
