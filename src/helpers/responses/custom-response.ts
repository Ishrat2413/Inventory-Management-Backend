import { Response } from 'express';

/**
 * Generates a consistent JSON response structure for API responses.
 * @param res - The response object.
 * @param success - Indicates if the response is successful.
 * @param statusCode - The HTTP status code.
 * @param message - A message to include in the response.
 * @param data - The data to include in the response (for successful responses).
 * @param errors - The errors to include in the response (for error responses).
 * @param error - A single error message to include in the response (for error responses).
 */
const ServerResponse = (
  res: Response,
  success: boolean,
  statusCode: number,
  message: string,
  data?: object | null,
  errors?: any[] | null,
  error?: any
): Response => {
  return res.status(statusCode).json({
    message,
    status: success,
    statusCode,
    path: res.req.originalUrl,
    method: res.req.method,
    timestamp: new Date().toISOString(),
    ...(success && { data }), // Include data only if success is true
    ...(errors && { errors }), // Always include errors if they exist
    ...(error && { error }), // Always include error if it exists
  });
};

export default ServerResponse;
