import { NextFunction, Response } from 'express';
import ServerResponse from '../helpers/responses/custom-response';

export type Role = 'ADMIN' | 'EMPLOYEE';

/**
 * Middleware to restrict route access based on user roles.
 * Supports checking multiple roles.
 *
 * @param {...Role} allowedRoles - The roles permitted to access the route.
 */
export const checkRoles = (...allowedRoles: Role[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    // Ensure user information has been set by the isAuthorized middleware
    if (!req.user) {
      return ServerResponse(res, false, 401, 'Unauthorized');
    }

    const { role } = req.user;

    // Check if user role matches one of the allowed roles
    if (!allowedRoles.includes(role as Role)) {
      return ServerResponse(res, false, 403, 'Forbidden: Insufficient permissions');
    }

    next();
  };
};
