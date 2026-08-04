import { Request, Response } from 'express';
import { reportServices } from './reports.service';
import { MonthlyQueryInput, DateRangeQueryInput, MonthlyParamsInput } from './reports.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export const getMonthlyReport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as MonthlyQueryInput;
  const result = await reportServices.getMonthlyReport(query);
  ServerResponse(res, true, 200, 'Monthly report generated successfully', result);
});

export const getSpendingReport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQueryInput;
  const result = await reportServices.getSpendingReport(query);
  ServerResponse(res, true, 200, 'Spending report retrieved successfully', result);
});

export const getCOGSReport = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as DateRangeQueryInput;
  const result = await reportServices.getCOGSReport(query);
  ServerResponse(res, true, 200, 'COGS report retrieved successfully', result);
});

export const getInventoryValueReport = catchAsync(async (_req: Request, res: Response) => {
  const result = await reportServices.getInventoryValue();
  ServerResponse(res, true, 200, 'Inventory value retrieved successfully', result);
});

export const getLowStockReport = catchAsync(async (_req: Request, res: Response) => {
  const result = await reportServices.getLowStockReport();
  ServerResponse(res, true, 200, 'Low stock report retrieved successfully', result);
});

export const generateMonthlyReport = catchAsync(async (req: AuthedRequest, res: Response) => {
  const result = await reportServices.generateMonthlyReport(req.body, req.user?.id);
  ServerResponse(res, true, 201, 'Monthly report snapshot generated successfully', result);
});

export const getStoredMonthlyReport = catchAsync(async (req: Request, res: Response) => {
  const params = req.params as unknown as MonthlyParamsInput;
  const result = await reportServices.getStoredMonthlyReport(params);
  ServerResponse(res, true, 200, 'Stored monthly report retrieved successfully', result);
});
