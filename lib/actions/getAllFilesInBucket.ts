import { AwsS3Client, Credentials } from '../AwsS3Client';
import { messages, createAWSInputs } from '../utils/utils';

let client: AwsS3Client;

export async function process(this: any, msg: any, cfg: Credentials): Promise<any> {
  this.logger.info('Starting "Get All Files in Bucket" action..');

  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  if (!bucketName) {
    throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketName}`);
  }
  const awsInput = createAWSInputs(bucketName);
  // Only set Prefix and Delimiter if not already set (i.e., when there's a folder)
  // If no folder, leave Prefix undefined to list all objects in the bucket root
  if (awsInput.Prefix) {
    awsInput.Delimiter = '/';
  }
  this.logger.info(`Checking if bucket ${bucketName} exists`);
  try {
    const exist = await client.exist(awsInput);
    if (!exist) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }
  } catch (error) {
    throw new Error(`Error checking if bucket ${bucketName} exists: ${error}`);
  }
  try {
    const data = await client.listObjects(awsInput);
    if (data.length === 0) {
      this.logger.info(`No objects found in bucket ${bucketName}`);
      return messages.newEmptyMessage();
    }
    this.logger.info(`Found ${data.length} objects in bucket ${bucketName}`);
    return messages.newMessageWithBody({ filenames: data.map((item: any) => item.Key) });
  } catch (error) {
    throw new Error(`Error listing objects in bucket ${bucketName}: ${error}`);
  }
}