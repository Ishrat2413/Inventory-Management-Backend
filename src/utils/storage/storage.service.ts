import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
  imageUrl: string;
  imageStorageId: string;
}

export interface IStorageProvider {
  uploadFile(file: any): Promise<UploadResult>;
  deleteFile(imageStorageId: string): Promise<void>;
}

// ────────────────────────────────────────────────
// Helper to get local base URL
// ────────────────────────────────────────────────
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || 'http://localhost';
  const port = process.env.PORT || '5001';
  if (baseUrl.includes('localhost') && !baseUrl.includes(`:${port}`)) {
    return `${baseUrl}:${port}`;
  }
  return baseUrl;
};

// ────────────────────────────────────────────────
// Local Directory Storage Provider
// ────────────────────────────────────────────────
class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string;

  constructor() {
    // Relative to dist/utils/storage/storage.service.js or src/utils/storage/storage.service.ts
    // We target backend/public/uploads
    this.uploadDir = path.resolve(__dirname, '..', '..', '..', 'public', 'uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: any): Promise<UploadResult> {
    const ext = path.extname(file.name);
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueId}${ext}`;
    const dest = path.join(this.uploadDir, filename);

    // Write file buffer to public/uploads
    await fs.promises.writeFile(dest, file.data);

    return {
      imageUrl: `${getBaseUrl()}/uploads/${filename}`,
      imageStorageId: filename,
    };
  }

  async deleteFile(imageStorageId: string): Promise<void> {
    const filePath = path.join(this.uploadDir, imageStorageId);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete local file ${imageStorageId}:`, error);
    }
  }
}

// ────────────────────────────────────────────────
// Cloudinary Storage Provider
// ────────────────────────────────────────────────
class CloudinaryStorageProvider implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: any): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'inventory_products' },
        (error, result) => {
          if (error) {
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          if (!result) {
            return reject(new Error('Cloudinary upload returned empty result'));
          }
          resolve({
            imageUrl: result.secure_url,
            imageStorageId: result.public_id,
          });
        }
      );
      stream.end(file.data);
    });
  }

  async deleteFile(imageStorageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(imageStorageId, (error, result) => {
        if (error) {
          console.error(`Failed to delete Cloudinary asset ${imageStorageId}:`, error);
          return reject(error);
        }
        resolve();
      });
    });
  }
}

// ────────────────────────────────────────────────
// Dynamic Factory Selection
// ────────────────────────────────────────────────
const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

export const storageProvider: IStorageProvider =
  providerType === 'cloudinary'
    ? new CloudinaryStorageProvider()
    : new LocalStorageProvider();
