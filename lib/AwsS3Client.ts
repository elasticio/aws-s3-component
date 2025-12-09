import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  paginateListObjectsV2,
  PutObjectCommandInput,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as presignUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface Credentials {
  bucketName?: string;
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint?: string;
  s3ForcePathStyle?: boolean;
  keyName?: string;
  csv?: {
    columns?: Array<{
      property: string;
      title: string;
    }>;
  };
  emitBehaviour?: 'emitIndividually' | 'fetchAll';
  enableFileAttachments?: boolean;
  usePreSignedUrls?: boolean;
  preSignedUrlExpiration?: number;
  startTime?: string;
  endTime?: string;
}

export interface AWSInput {
  Bucket: string;
  Delimiter?: string;
  Prefix?: string;
  Marker?: string;
}

export interface S3Object {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
  Owner?: {
    ID: string;
    DisplayName?: string;
  };
}

export class AwsS3Client {
  private logger: any;

  private s3: S3Client;

  private cfg: Credentials;

  constructor(context: any, cfg: Credentials) {
    this.logger = context.logger;
    this.cfg = cfg;
    this.s3 = new S3Client(buildS3Config(cfg));
  }

  setLogger(logger: any) {
    this.logger = logger;
  }

  async exist(awsInput: AWSInput): Promise<boolean> {
    const params = {
      Bucket: awsInput.Bucket,
    };
    try {
      const response = await this.s3.send(new HeadBucketCommand(params));
      const { httpStatusCode } = response.$metadata;
      return httpStatusCode === 200;
    } catch (e: any) {
      const status = e?.$metadata?.httpStatusCode;
      if (status === 404 || e?.name === 'NotFound') {
        return false;
      }
      if (!e.message) {
        e.message = `${e.name || 'S3Error'}: bucket name was '${params.Bucket}'`;
      }
      throw e;
    }
  }

  async getFileFromBucket(bucketName: string, fileName: string): Promise<S3Object | null> {
    this.logger.info('Searching for file in bucket');
    const params = {
      Bucket: bucketName,
      Delimiter: '/',
      Prefix: fileName,
    };
    const data = await this.s3.send(new ListObjectsV2Command(params));
    const foundFiles = (data.Contents || []).filter((item) => item.Key === fileName);
    this.logger.trace('Filtering complete');
    if (foundFiles.length !== 1) {
      this.logger.trace('No files with provided name');
      return null;
    }
    this.logger.trace('File was found');
    return foundFiles[0] as S3Object;
  }

  async copyObject(copySource: string, bucketName: string, key: string) {
    const params = {
      CopySource: encodeURIComponent(copySource),
      Bucket: bucketName,
      Key: key,
    };
    return this.s3.send(new CopyObjectCommand(params));
  }

  async listObjects(awsInput: AWSInput, prefix?: string): Promise<S3Object[]> {
    const params: AWSInput = { ...awsInput };
    if (prefix) params.Prefix = prefix;

    const response: S3Object[] = [];
    const paginator = paginateListObjectsV2({ client: this.s3 }, params);
    for await (const page of paginator) {
      if (page.Contents) {
        response.push(...(page.Contents as S3Object[]));
      }
    }
    return response;
  }

  async getObjectMetadata(bucketName: string, fileName: string) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    return this.s3.send(new HeadObjectCommand(params));
  }

  async getObject(bucketName: string, fileName: string) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    return this.s3.send(new GetObjectCommand(params));
  }

  async getObjectReadStream(bucketName: string, fileName: string): Promise<Readable> {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };

    const response = await this.s3.send(new GetObjectCommand(params));
    const body = response.Body;
    if (body instanceof Readable) return body;
    if (body instanceof Uint8Array) return Readable.from(body);
    if (typeof body === 'string') return Readable.from([body]);
    throw new Error('S3 response Body is not a readable stream');
  }

  async deleteObject(bucketName: string, fileName: string) {
    return this.s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: fileName }));
  }

  async upload(bucketName: string, fileName: string, body: PutObjectCommandInput['Body']) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: body,
    };
    const upload = new Upload({ client: this.s3, params });
    return upload.done();
  }

  async listBucketNames(): Promise<string[]> {
    const bucketData = await this.s3.send(new ListBucketsCommand({}));
    return (bucketData.Buckets || []).map((bucket) => bucket.Name || '');
  }

  /**
   * Generate a pre-signed URL for getting an object from S3.
   * @param bucketName - The name of the bucket
   * @param fileName - The key/name of the file
   * @param expirationSeconds - URL expiration time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days)
   * @returns Pre-signed URL string
   */
  async getSignedUrl(bucketName: string, fileName: string, expirationSeconds: number = 3600): Promise<string> {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Expires: Math.min(Math.max(expirationSeconds, 1), 604800),
    };
    const expiresIn = params.Expires;
    return presignUrl(this.s3, new GetObjectCommand({ Bucket: params.Bucket, Key: params.Key }), { expiresIn });
  }
}

export function buildS3Config(cfg: Credentials): S3ClientConfig {
  const { accessKeyId, accessKeySecret, region, endpoint, s3ForcePathStyle } = cfg;
  const s3Config: S3ClientConfig = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey: accessKeySecret,
    },
  };

  if (endpoint) {
    s3Config.endpoint = endpoint;
    s3Config.forcePathStyle = s3ForcePathStyle ?? true;
  }

  return s3Config;
}

