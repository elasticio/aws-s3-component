const packageJson = require('../../package.json');
const compJson = require('../../component.json');
import { Readable } from 'stream';

export function getUserAgent(): string {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const libVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${libVersion}`;
}

export interface AWSInput {
  Bucket: string;
  Delimiter?: string;
  Prefix?: string;
}

export function createAWSInputs(bucketName: string): AWSInput {
  let name = bucketName;
  if (bucketName.startsWith('/')) {
    name = bucketName.substring(1);
  }
  if (name.indexOf('/') > -1) {
    const index = name.indexOf('/');
    const folder = `${name.substring(index + 1)}/`;
    const bucket = name.substring(0, index);
    return { Bucket: bucket, Delimiter: '/', Prefix: folder };
  }
  return { Bucket: name };
}

export const messages = {
  newMessageWithBody: (body: any) => ({ body }),
  newEmptyMessage: () => ({ body: {} }),
};

export function formatFolder(folder: string): string {
  if (folder) {
    if (folder.indexOf('/') === 0) {
      folder = folder.substring(1);
    }
    if (folder.substring(folder.length - 1) !== '/') {
      folder = `${folder}/`;
    }
  }
  return folder;
}

export function checkFieldNotFolder(fieldName: string, fieldValue: string): void {
  if (fieldValue.indexOf('/') > -1) {
    throw new Error(`${fieldName} shouldn't contains symbol '\\'`);
  }
}

/**
 * Parses a bucket name that may include a folder path and constructs the full S3 key.
 * @param bucketNameInput - Bucket name that may include folder path (e.g., 'bucket-name/folder-1' or 'bucket-name/')
 * @param filename - The filename/key to use
 * @returns Object with actual bucket name and full key (with prefix if folder was specified)
 */
export function parseBucketAndKey(bucketNameInput: string, filename: string): { bucketName: string; fullKey: string } {
  const awsInput = createAWSInputs(bucketNameInput);
  const bucketName = awsInput.Bucket;
  
  // If there's a prefix (folder), prepend it to the filename
  const fullKey = awsInput.Prefix 
    ? `${awsInput.Prefix}${filename}`.replace(/\/+/g, '/').replace(/^\//, '')
    : filename;
  
  return { bucketName, fullKey };
}

/**
 * Converts S3 GetObjectCommandOutput Body to a Buffer.
 * Handles different body types: Uint8Array, string, Readable stream, or null/undefined.
 * @param body - The body from GetObjectCommandOutput
 * @returns Promise that resolves to a Buffer
 */
export async function toBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Unsupported S3 body type');
}