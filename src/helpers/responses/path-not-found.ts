import { NextFunction, Request, Response } from 'express';

/**
 * Middleware function to handle requests to undefined routes.
 * Sends a JSON response with a 404 status code indicating that the path was not found.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function (not used here).
 * @returns {void}
 */
const PathNotFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    message: 'Path not found',
    status: false,
    statusCode: 404,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

export default PathNotFound;
