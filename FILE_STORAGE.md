# File Storage System

## Overview
The application now uses a modular file storage system that is not dependent on Replit's proprietary storage service. This makes it suitable for deployment to any platform and easily extensible to different cloud storage providers.

## Current Implementation
- **Local Storage**: Files are stored in the local filesystem under `storage/private/uploads/`
- **Environment Variable**: `FILE_STORAGE_TYPE=local` (default)
- **No External Dependencies**: No need for Google Cloud Storage or Replit-specific services

## File Upload Flow
1. Client requests upload URL: `POST /api/objects/upload`
2. Server returns unique upload endpoint: `PUT /api/upload/{uploadId}`
3. Client uploads file to the endpoint
4. Server stores file locally and returns file URL: `/api/files/{fileName}`
5. Client associates file with patient via: `PUT /api/patient-files`

## File Serving
- Files are served through: `GET /api/files/{fileName}`
- Proper MIME types are set based on file extensions
- Access control through authentication middleware

## Future Cloud Storage Support
The system is designed to easily support cloud storage providers:

### AWS S3 (Ready to implement)
```typescript
export class S3FileStorage implements FileStorageProvider {
  // Implementation with AWS SDK
}
```

### Google Cloud Storage (Ready to implement)
```typescript
export class GoogleCloudStorage implements FileStorageProvider {
  // Implementation with Google Cloud SDK
}
```

### Configuration
Set `FILE_STORAGE_TYPE` environment variable:
- `local` - Local filesystem storage (default)
- `s3` - Amazon S3 storage
- `gcs` - Google Cloud Storage

## Migration Benefits
- ✅ Removed dependency on Replit's proprietary services
- ✅ Works in any deployment environment
- ✅ Easy to extend to cloud storage providers
- ✅ Cost-effective local storage for development
- ✅ Simplified codebase without external service dependencies
- ✅ Production-ready architecture