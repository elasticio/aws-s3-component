import { AttachmentProcessor } from '@elastic.io/component-commons-library';
import { getUserAgent, messages, parseBucketAndKey } from '../utils/utils';
import { AwsS3Client, Credentials } from '../AwsS3Client';

export async function process(this: any, msg: any, cfg: Credentials): Promise<any> {
  const s3Client = new AwsS3Client(this, cfg);
  const bucketNameInput = msg.body.bucketName || cfg.bucketName;
  if (!bucketNameInput) {
    throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketNameInput}`);
  }
  const { fileName } = msg.body;
  const { bucketName: actualBucketName, fullKey } = parseBucketAndKey(bucketNameInput, fileName);

  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
  const fileStream = await attachmentProcessor.getAttachment(msg.body.attachmentUrl, 'stream');

  const result = await s3Client.upload(actualBucketName, fullKey, fileStream.data);
  return messages.newMessageWithBody(result);
}

export async function getMetaModel(this: any, cfg: Credentials): Promise<any> {
  const s3Client = new AwsS3Client(this, cfg);
  const bucketNames = await s3Client.listBucketNames();
  return {
    in: {
      type: 'object',
      required: true,
      properties: {
        bucketName: {
          title: 'Bucket Name',
          type: 'string',
          enum: bucketNames,
          required: true,
          order: 3,
        },
        fileName: {
          title: 'File Name (& any folders) (Key)',
          type: 'string',
          required: true,
          order: 2,
        },
        attachmentUrl: {
          title: 'Platform Attachment URL',
          type: 'string',
          required: true,
          order: 1,
        },
      },
    },
    out: {
      type: 'object',
      required: true,
      properties: {
        ETag: {
          title: 'ETag',
          type: 'string',
          required: true,
        },
        Key: {
          title: 'Key',
          type: 'string',
          required: true,
        },
        Location: {
          title: 'Location',
          type: 'string',
          required: true,
        },
        Bucket: {
          title: 'Bucket',
          type: 'string',
          required: true,
        },
      },
    },
  };
}
