import { Request, Response } from 'express';
import { vendorServices } from './vendors.service';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import { SearchQueryInput } from '../../handlers/common-zod-validator';

export const createVendor = catchAsync(async (req: Request, res: Response) => {
  const result = await vendorServices.createVendor(req.body);
  ServerResponse(res, true, 201, 'Vendor created successfully', result);
});

export const updateVendor = catchAsync(async (req: Request, res: Response) => {
  const result = await vendorServices.updateVendor(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'Vendor updated successfully', result);
});

export const deleteVendor = catchAsync(async (req: Request, res: Response) => {
  const result = await vendorServices.deleteVendor(req.params.id as string);
  ServerResponse(res, true, 200, 'Vendor deactivated successfully', result);
});

export const getVendorById = catchAsync(async (req: Request, res: Response) => {
  const result = await vendorServices.getVendorById(req.params.id as string);
  ServerResponse(res, true, 200, 'Vendor retrieved successfully', result);
});

export const getManyVendor = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as SearchQueryInput;
  const { vendors, totalData, totalPages } = await vendorServices.getManyVendor(query);
  ServerResponse(res, true, 200, 'Vendors retrieved successfully', { vendors, totalData, totalPages });
});
