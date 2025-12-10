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
    this.logger.debug('Entering setLogger');
    this.logger = logger;
    this.logger.debug('Exiting setLogger');
  }

  async exist(awsInput: AWSInput): Promise<boolean> {
    this.logger.debug('Entering exist method for bucket:', awsInput.Bucket);
    const params = {
      Bucket: awsInput.Bucket,
    };
    let result: boolean | undefined;
    try {
      this.logger.debug('Sending HeadBucketCommand with params:', params);
      const response = await this.s3.send(new HeadBucketCommand(params));
      const { httpStatusCode } = response.$metadata;
      result = httpStatusCode === 200;
      return result;
    } catch (e: any) {
      const status = e?.$metadata?.httpStatusCode;
      if (status === 404 || e?.name === 'NotFound') {
        this.logger.info(`Bucket '${params.Bucket}' not found.`);
        result = false;
        return false;
      }
      if (!e.message) {
        e.message = `${e.name || 'S3Error'}: bucket name was '${params.Bucket}'`;
      }
      this.logger.error('Unexpected error checking existence of bucket:', params.Bucket, 'Error:', e);
      throw e;
    } finally {
      this.logger.debug('Exiting exist method with result:', result);
    }
  }

  async getFileFromBucket(bucketName: string, fileName: string): Promise<S3Object | null> {
    this.logger.debug('Entering getFileFromBucket for bucket:', bucketName, 'file:', fileName);
    this.logger.info('Searching for file in bucket');
    const params = {
      Bucket: bucketName,
      Delimiter: '/',
      Prefix: fileName,
    };
    this.logger.debug('Sending ListObjectsV2Command with params:', params);
    try {
      const data = await this.s3.send(new ListObjectsV2Command(params));
      const foundFiles = (data.Contents || []).filter((item) => item.Key === fileName);
      this.logger.trace('Filtering complete');
      if (foundFiles.length !== 1) {
        this.logger.trace('No files with provided name');
        return null;
      }
      this.logger.trace('File was found');
      return foundFiles[0] as S3Object;
    } catch (error) {
      this.logger.error('Error in getFileFromBucket for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting getFileFromBucket for bucket:', bucketName, 'file:', fileName);
    }
  }

  async copyObject(copySource: string, bucketName: string, key: string) {
    this.logger.debug('Entering copyObject for bucket:', bucketName, 'key:', key);
    const params = {
      CopySource: encodeURIComponent(copySource),
      Bucket: bucketName,
      Key: key,
    };
    this.logger.debug('Sending CopyObjectCommand with params:', { bucketName, key, copySource });
    try {
      const response = await this.s3.send(new CopyObjectCommand(params));
      this.logger.debug('Exiting copyObject with response metadata:', response?.$metadata);
      return response;
    } catch (error) {
      this.logger.error('Error in copyObject for bucket:', bucketName, 'key:', key, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting copyObject method for bucket:', bucketName, 'key:', key);
    }
  }

  async listObjects(awsInput: AWSInput, prefix?: string): Promise<S3Object[]> {
    this.logger.debug('Entering listObjects for bucket:', awsInput.Bucket, 'prefix:', prefix);
    const params: AWSInput = { ...awsInput };
    if (prefix) params.Prefix = prefix;

    const response: S3Object[] = [];
    this.logger.debug('Sending paginate ListObjectsV2Command with params:', params);
    try {
      const paginator = paginateListObjectsV2({ client: this.s3 }, params);
      for await (const page of paginator) {
        if (page.Contents) {
          response.push(...(page.Contents as S3Object[]));
        }
      }
      this.logger.debug(`Found ${response.length} objects in bucket ${awsInput.Bucket}`);
      return response;
    } catch (error) {
      this.logger.error('Error listing objects for bucket:', awsInput.Bucket, 'prefix:', prefix, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting listObjects for bucket:', awsInput.Bucket, 'prefix:', prefix);
    }
  }

  async getObjectMetadata(bucketName: string, fileName: string) {
    this.logger.debug('Entering getObjectMetadata for bucket:', bucketName, 'file:', fileName);
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    this.logger.debug('Sending HeadObjectCommand with params:', params);
    try {
      const response = await this.s3.send(new HeadObjectCommand(params));
      this.logger.debug('Exiting getObjectMetadata with status:', response?.$metadata?.httpStatusCode);
      return response;
    } catch (error) {
      this.logger.error('Error getting object metadata for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting getObjectMetadata for bucket:', bucketName, 'file:', fileName);
    }
  }

  async getObject(bucketName: string, fileName: string) {
    this.logger.debug('Entering getObject for bucket:', bucketName, 'file:', fileName);
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    this.logger.debug('Sending GetObjectCommand with params:', params);
    try {
      const response = await this.s3.send(new GetObjectCommand(params));
      this.logger.debug('Exiting getObject with status:', response?.$metadata?.httpStatusCode);
      return response;
    } catch (error) {
      this.logger.error('Error getting object for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting getObject for bucket:', bucketName, 'file:', fileName);
    }
  }

  async getObjectReadStream(bucketName: string, fileName: string): Promise<Readable> {
    this.logger.debug('Entering getObjectReadStream for bucket:', bucketName, 'file:', fileName);
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };

    this.logger.debug('Sending GetObjectCommand with params:', params);
    try {
      const response = await this.s3.send(new GetObjectCommand(params));
      const body = response.Body;
      if (body instanceof Readable) return body;
      if (body instanceof Uint8Array) return Readable.from(body);
      if (typeof body === 'string') return Readable.from([body]);
      throw new Error('S3 response Body is not a readable stream');
    } catch (error) {
      this.logger.error('Error getting object read stream for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting getObjectReadStream for bucket:', bucketName, 'file:', fileName);
    }
  }

  async deleteObject(bucketName: string, fileName: string) {
    this.logger.debug('Entering deleteObject for bucket:', bucketName, 'file:', fileName);
    const params = { Bucket: bucketName, Key: fileName };
    this.logger.debug('Sending DeleteObjectCommand with params:', params);
    try {
      const response = await this.s3.send(new DeleteObjectCommand(params));
      this.logger.debug('Exiting deleteObject with status:', response?.$metadata?.httpStatusCode);
      return response;
    } catch (error) {
      this.logger.error('Error deleting object for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting deleteObject for bucket:', bucketName, 'file:', fileName);
    }
  }

  async upload(bucketName: string, fileName: string, body: PutObjectCommandInput['Body']) {
    this.logger.debug('Entering upload for bucket:', bucketName, 'file:', fileName);
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: body,
    };
    this.logger.debug('Initiating multipart upload with params:', { bucketName, fileName });
    const upload = new Upload({ client: this.s3, params });
    try {
      const result = await upload.done();
      this.logger.debug('Exiting upload with result:', result);
      return result;
    } catch (error) {
      this.logger.error('Error uploading object for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting upload for bucket:', bucketName, 'file:', fileName);
    }
  }

  async listBucketNames(): Promise<string[]> {
    this.logger.debug('Entering listBucketNames');
    this.logger.debug('Sending ListBucketsCommand');
    try {
      const bucketData = await this.s3.send(new ListBucketsCommand({}));
      const buckets = (bucketData.Buckets || []).map((bucket) => bucket.Name || '');
      this.logger.debug('Exiting listBucketNames with count:', buckets.length);
      return buckets;
    } catch (error) {
      this.logger.error('Error listing bucket names:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting listBucketNames');
    }
  }

  /**
   * Generate a pre-signed URL for getting an object from S3.
   * @param bucketName - The name of the bucket
   * @param fileName - The key/name of the file
   * @param expirationSeconds - URL expiration time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days)
   * @returns Pre-signed URL string
   */
  async getSignedUrl(bucketName: string, fileName: string, expirationSeconds: number = 3600): Promise<string> {
    this.logger.debug('Entering getSignedUrl for bucket:', bucketName, 'file:', fileName);
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Expires: Math.min(Math.max(expirationSeconds, 1), 604800),
    };
    const expiresIn = params.Expires;
    this.logger.debug('Preparing pre-signed URL with params:', { bucketName, fileName, expiresIn });
    try {
      const url = await presignUrl(this.s3, new GetObjectCommand({ Bucket: params.Bucket, Key: params.Key }), { expiresIn });
      this.logger.debug('Exiting getSignedUrl successfully');
      return url;
    } catch (error) {
      this.logger.error('Error generating signed URL for bucket:', bucketName, 'file:', fileName, 'Error:', error);
      throw error;
    } finally {
      this.logger.debug('Exiting getSignedUrl for bucket:', bucketName, 'file:', fileName);
    }
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

