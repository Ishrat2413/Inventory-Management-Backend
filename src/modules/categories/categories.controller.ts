import { Request, Response } from 'express';
import { categoryServices } from './categories.service';
import { createCategorySchema, updateCategorySchema } from './categories.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import ApiError from '../../utils/errors/api-error';

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
  const result = await categoryServices.createCategory(parsed.data);
  ServerResponse(res, true, 201, 'Category created successfully', result);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
  const result = await categoryServices.updateCategory(req.params.id as string, parsed.data);
  ServerResponse(res, true, 200, 'Category updated successfully', result);
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await categoryServices.deleteCategory(req.params.id as string);
  ServerResponse(res, true, 200, 'Category deleted successfully', null);
});

export const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryServices.getCategoryById(req.params.id as string);
  ServerResponse(res, true, 200, 'Category retrieved successfully', result);
});

export const getManyCategories = catchAsync(async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const result = await categoryServices.getManyCategories(search);
  ServerResponse(res, true, 200, 'Categories retrieved successfully', result);
});
