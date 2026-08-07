import { NextFunction, Request, RequestHandler, Response } from 'express';
import ServerResponse from '../../helpers/responses/custom-response';
import ApiError from '../errors/api-error';
import config from '../../config/config';

/**
 * A utility function to handle asynchronous route handlers and middleware.
 *
 * Wraps async route handlers/middleware and catches any errors thrown or
 * returned as rejected promises. Known `ApiError`s are translated to their
 * intended status code + machine-readable error code; anything else falls
 * back to a 500 response, matching the original boilerplate behaviour.
 *
 * @param {RequestHandler} fn - The asynchronous route handler or middleware function to be wrapped.
 * @returns {RequestHandler} A new function that wraps the provided asynchronous handler or middleware.
 */
const catchAsync = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('Async error:', err);

      if (err instanceof ApiError) {
        return ServerResponse(res, false, err.statusCode, err.message, null, null, {
          code: err.code,
          details: err.details,
        });
      }

      // Prisma known-error codes we care about generically (e.g. unique constraint, FK violation)
      if (err?.code === 'P2002') {
        return ServerResponse(res, false, 409, 'A record with this value already exists', null, null, {
          code: 'DUPLICATE_ENTRY',
          fields: err?.meta?.target,
        });
      }
      if (err?.code === 'P2025') {
        return ServerResponse(res, false, 404, 'Record not found', null, null, { code: 'NOT_FOUND' });
      }
      if (err?.code === 'P2003') {
        return ServerResponse(res, false, 409, 'This record is referenced by other data and cannot be modified', null, null, {
          code: 'FOREIGN_KEY_CONSTRAINT',
        });
      }

      ServerResponse(res, false, 500, 'An unexpected error occurred', null, null, err.message);
    });
  };
};

export default catchAsync;
