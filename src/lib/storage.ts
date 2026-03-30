import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

let s3Client: S3Client | null = null;

/**
 * Initialize AWS S3 client
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY'
      );
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log(`✓ AWS S3 client initialized (region: ${region})`);
  }

  return s3Client;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * Get S3 bucket name
 */
function getBucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET not configured');
  }
  return bucket;
}

/**
 * Upload file to S3
 */
export async function uploadFile(
  file: File | Buffer,
  folder: string = 'receipts',
  metadata?: Record<string, string>
): Promise<{
  key: string;
  url: string;
  bucket: string;
}> {
  const client = getS3Client();
  const bucket = getBucketName();

  // Generate unique filename
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'bin';
  const key = `${folder}/${uuidv4()}.${fileExt}`;

  // Get file buffer
  const buffer =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: file instanceof File ? file.type : 'application/octet-stream',
    Metadata: metadata,
  });

  await client.send(command);

  // Generate public URL
  const url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  return { key, url, bucket };
}

/**
 * Upload receipt with metadata
 */
export async function uploadReceipt(
  file: File,
  expenseId: string,
  userId: string
): Promise<{
  key: string;
  url: string;
  storage: 's3' | 'local';
}> {
  return uploadFileWithFallback(file, 'receipts', {
    expenseId,
    userId,
    uploadedAt: new Date().toISOString(),
  });
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generate presigned URL for temporary access
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Upload multiple files (batch upload)
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string = 'receipts'
): Promise<
  Array<{
    fileName: string;
    key: string;
    url: string;
    success: boolean;
    error?: string;
  }>
> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const result = await uploadFile(file, folder);
      return {
        fileName: file.name,
        ...result,
        success: true,
      };
    })
  );

  return results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        fileName: files[idx].name,
        key: '',
        url: '',
        success: false,
        error: result.reason?.message || 'Upload failed',
      };
    }
  });
}

/**
 * Fallback: Save file to local filesystem
 * Used when S3 is not configured
 */
export async function saveFileLocally(
  file: File | Buffer,
  folder: string = 'receipts'
): Promise<{ key: string; url: string }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Create upload directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'bin';
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = path.join(uploadDir, fileName);

  // Write file
  const buffer =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  await fs.writeFile(filePath, buffer);

  const key = `${folder}/${fileName}`;
  const url = `/uploads/${folder}/${fileName}`;

  return { key, url };
}

/**
 * Universal upload function with fallback
 */
export async function uploadFileWithFallback(
  file: File | Buffer,
  folder: string = 'receipts',
  metadata?: Record<string, string>
): Promise<{
  key: string;
  url: string;
  storage: 's3' | 'local';
}> {
  if (isS3Configured()) {
    try {
      const result = await uploadFile(file, folder, metadata);
      return { ...result, storage: 's3' };
    } catch (error) {
      console.error('S3 upload failed, falling back to local storage:', error);
      const result = await saveFileLocally(file, folder);
      return { ...result, storage: 'local' };
    }
  } else {
    const result = await saveFileLocally(file, folder);
    return { ...result, storage: 'local' };
  }
}
