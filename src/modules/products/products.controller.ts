import { Request, Response } from 'express';
import { productServices } from './products.service';
import { ProductSearchQueryInput } from './products.validation';
import ServerResponse from '../../helpers/responses/custom-response';
import catchAsync from '../../utils/catch-async/catch-async';
import { storageProvider } from '../../utils/storage/storage.service';

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  let uploadRes: { imageUrl: string; imageStorageId: string } | null = null;
  console.log("DEBUG CREATE - files:", req.files ? Object.keys(req.files) : "none", "body:", req.body);

  try {
    // Check if an image file was uploaded
    if (req.files && req.files.image) {
      uploadRes = await storageProvider.uploadFile(req.files.image);
      req.body.imageUrl = uploadRes.imageUrl;
      req.body.imageStorageId = uploadRes.imageStorageId;
      console.log("DEBUG CREATE UPLOAD SUCCESS:", uploadRes);
    }

    const result = await productServices.createProduct(req.body);
    ServerResponse(res, true, 201, 'Product created successfully', result);
  } catch (error) {
    console.error("DEBUG CREATE FAILED:", error);
    // Clean up uploaded file if database creation fails
    if (uploadRes) {
      await storageProvider.deleteFile(uploadRes.imageStorageId);
    }
    throw error;
  }
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.id as string;
  let uploadRes: { imageUrl: string; imageStorageId: string } | null = null;
  let oldImageStorageIdToDelete: string | null = null;
  console.log("DEBUG UPDATE - files:", req.files ? Object.keys(req.files) : "none", "body:", req.body);

  try {
    const existingProduct = await productServices.getProductById(productId);

    if (req.files && req.files.image) {
      // User uploaded a new image
      uploadRes = await storageProvider.uploadFile(req.files.image);
      req.body.imageUrl = uploadRes.imageUrl;
      req.body.imageStorageId = uploadRes.imageStorageId;
      console.log("DEBUG UPDATE UPLOAD SUCCESS:", uploadRes);
      
      // Mark old image for deletion
      if (existingProduct.imageStorageId) {
        oldImageStorageIdToDelete = existingProduct.imageStorageId;
      }
    } else if (req.body.removeImage === 'true') {
      // User requested to remove the existing image
      req.body.imageUrl = null;
      req.body.imageStorageId = null;
      if (existingProduct.imageStorageId) {
        oldImageStorageIdToDelete = existingProduct.imageStorageId;
      }
    }

    const result = await productServices.updateProduct(productId, req.body);

    // Delete old image from storage now that the database update succeeded
    if (oldImageStorageIdToDelete) {
      await storageProvider.deleteFile(oldImageStorageIdToDelete);
    }

    ServerResponse(res, true, 200, 'Product updated successfully', result);
  } catch (error) {
    console.error("DEBUG UPDATE FAILED:", error);
    // Clean up newly uploaded file if database update fails
    if (uploadRes) {
      await storageProvider.deleteFile(uploadRes.imageStorageId);
    }
    throw error;
  }
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
  const query = ((req as any).validatedQuery || req.query) as unknown as ProductSearchQueryInput;
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
