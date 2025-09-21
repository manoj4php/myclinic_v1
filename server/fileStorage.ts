import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export interface FileStorageProvider {
  uploadFile(buffer: Buffer, fileName: string, metadata?: any): Promise<string>;
  getFileUrl(filePath: string): string;
  deleteFile(filePath: string): Promise<void>;
}

export class LocalFileStorage implements FileStorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir: string = "storage/private/uploads", baseUrl?: string) {
    this.baseDir = path.resolve(baseDir);
    this.baseUrl = baseUrl || `http://localhost:${process.env.PORT || 5000}`;
    
    // Ensure the directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(buffer: Buffer, fileName: string, metadata?: any): Promise<string> {
    const fileId = randomUUID();
    const extension = path.extname(fileName);
    const storedFileName = `${fileId}${extension}`;
    const filePath = path.join(this.baseDir, storedFileName);
    
    // Write file to disk
    fs.writeFileSync(filePath, buffer);
    
    // Return the relative path for storage in database
    return storedFileName;
  }

  getFileUrl(filePath: string): string {
    return `${this.baseUrl}/api/files/${filePath}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

// Future cloud storage providers can be added here
// export class S3FileStorage implements FileStorageProvider { ... }
// export class GoogleCloudStorage implements FileStorageProvider { ... }

// Factory function to get the appropriate storage provider
export function getFileStorageProvider(): FileStorageProvider {
  const storageType = process.env.FILE_STORAGE_TYPE || 'local';
  
  switch (storageType) {
    case 'local':
      return new LocalFileStorage();
    // case 's3':
    //   return new S3FileStorage();
    // case 'gcs':
    //   return new GoogleCloudStorage();
    default:
      return new LocalFileStorage();
  }
}

export { ObjectNotFoundError } from "./objectStorage";