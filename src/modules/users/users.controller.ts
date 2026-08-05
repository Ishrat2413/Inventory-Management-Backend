import { Request, Response } from 'express';
import { userServices } from './users.service';
import { UserSearchQueryInput, EarningsQueryInput } from './users.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import ApiError from '../../utils/errors/api-error';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

/** POST /users — create a new user/employee (Admin only) */
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userServices.createUser(req.body);
  ServerResponse(res, true, 201, 'User created successfully', result);
});

/** PATCH /users/:id — update user / employee profile / rates / rules (Admin only) */
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userServices.updateUser(id as string, req.body);
  if (!result) throw ApiError.notFound('User not found');
  ServerResponse(res, true, 200, 'User updated successfully', result);
});

/** DELETE /users/:id — soft-delete / deactivate a user (Admin only) */
export const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await userServices.deactivateUser(id as string);
  if (!result) throw ApiError.notFound('User not found');
  ServerResponse(res, true, 200, 'User deactivated successfully', result);
});

/** GET /users/:id — get user details + employee profile (Admin / Self) */
export const getUserById = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user?.role !== 'ADMIN' && req.user?.id !== id) {
    throw ApiError.forbidden();
  }
  const result = await userServices.getUserById(id as string);
  if (!result) throw ApiError.notFound('User not found');
  ServerResponse(res, true, 200, 'User retrieved successfully', result);
});

/** GET /users — list all users with filters (Admin only) */
export const getManyUser = catchAsync(async (req: Request, res: Response) => {
  const query = ((req as any).validatedQuery || req.query) as unknown as UserSearchQueryInput;
  const { users, totalData, totalPages } = await userServices.getManyUser(query);
  ServerResponse(res, true, 200, 'Users retrieved successfully', { users, totalData, totalPages });
});

/** GET /users/me — current user profile + real-time estimated earnings (Employee) */
export const getMe = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await userServices.getMe(req.user!.id);
  ServerResponse(res, true, 200, 'Profile retrieved successfully', result);
});

/** PATCH /users/me — update own basic profile (Employee) */
export const updateMe = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await userServices.updateMe(req.user!.id, req.body);
  ServerResponse(res, true, 200, 'Profile updated successfully', result);
});

/** GET /users/me/earnings — detailed earnings breakdown (Employee) */
export const getMyEarnings = catchAsync(async (req: AuthedRequest, res: Response) => {
  const query = req.query as unknown as EarningsQueryInput;
  const result = await userServices.getMyEarnings(req.user!.id, query);
  ServerResponse(res, true, 200, 'Earnings retrieved successfully', result);
});
