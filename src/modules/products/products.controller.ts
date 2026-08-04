import { Request, Response } from 'express';
import { productServices } from './products.service';
import { ProductSearchQueryInput } from './products.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.createProduct(req.body);
  ServerResponse(res, true, 201, 'Product created successfully', result);
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.updateProduct(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'Product updated successfully', result);
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.deleteProduct(req.params.id as string);
  ServerResponse(res, true, 200, 'Product discontinued successfully', result);
});

export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.getProductById(req.params.id as string);
  ServerResponse(res, true, 200, 'Product retrieved successfully', result);
});

export const getManyProduct = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as unknown as ProductSearchQueryInput;
  const { products, totalData, totalPages } = await productServices.getManyProduct(query);
  ServerResponse(res, true, 200, 'Products retrieved successfully', { products, totalData, totalPages });
});

export const getLowStockProducts = catchAsync(async (_req: Request, res: Response) => {
  const result = await productServices.getLowStockProducts();
  ServerResponse(res, true, 200, 'Low stock products retrieved successfully', result);
});

export const getProductBOM = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.getProductBOM(req.params.id as string);
  ServerResponse(res, true, 200, 'BOM tree retrieved successfully', result);
});

export const replaceProductBOM = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.replaceProductBOM(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'BOM replaced successfully', result);
});

export const addOrUpdateCustomField = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.addOrUpdateCustomField(req.params.id as string, req.body);
  ServerResponse(res, true, 200, 'Custom field saved successfully', result);
});

export const removeCustomField = catchAsync(async (req: Request, res: Response) => {
  const result = await productServices.removeCustomField(req.params.id as string, req.params.key as string);
  ServerResponse(res, true, 200, 'Custom field removed successfully', result);
});
