/* eslint-disable func-names */
import { AwsS3Client, Credentials } from '../AwsS3Client';
import { messages, parseBucketAndKey } from '../utils/utils';

let client: AwsS3Client;

export async function process(this: any, msg: any, cfg: Credentials): Promise<any> {
  this.logger.info('Starting "Delete Object" action..');

  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const bucketNameInput = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  if (!bucketNameInput) {
    throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketNameInput}`);
  }
  const { filename } = msg.body;
  const { bucketName: actualBucketName, fullKey } = parseBucketAndKey(bucketNameInput, filename);

  this.logger.info(`Checking if file ${filename} exists in bucket ${bucketNameInput}`);
  try {
    await client.getObjectMetadata(actualBucketName, fullKey);
    this.logger.info(`File ${filename} exists in bucket ${bucketNameInput}`);
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === 'NotFound' || err?.code === 'NotFound') {
      this.logger.warn(`File ${filename} not found in bucket ${bucketNameInput}`);
      return messages.newEmptyMessage();
    }
    throw new Error(`Error checking if file ${filename} exists in bucket ${bucketNameInput}: ${err}`);
  }

  try {
    await client.deleteObject(actualBucketName, fullKey);
    this.logger.info(`File ${filename} deleted from bucket ${bucketNameInput}`);
    return messages.newMessageWithBody({ filename });
  } catch (error) {
    throw new Error(`Error deleting file ${filename} from bucket ${bucketNameInput}: ${error}`);
  }
}
