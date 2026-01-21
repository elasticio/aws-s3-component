import { messages, getUserAgent, parseBucketAndKey } from '../utils/utils';
import { AwsS3Client } from '../AwsS3Client';
import { Credentials } from '../AwsS3Client';
import { AttachmentProcessor } from '@elastic.io/component-commons-library';

let client: AwsS3Client;

export async function process(msg: any, cfg: Credentials): Promise<any> {
  this.logger.info('Starting "Stream to File" action..');
  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const bucketNameInput = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  if (!bucketNameInput) {
    throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketNameInput}`);
  }

  if (!msg.attachments) {
    throw new Error('Message has no attachments object (no attachments)');
  } else if (Object.keys(msg.attachments).length > 1) {
    throw new Error('More than 1 attachment');
  } else if (Object.keys(msg.attachments).length === 0) {
    throw new Error('Has no attachment');
  }
  
  const attachments = Object.keys(msg.attachments).map((attachmentKey) => {
    return {
      key: attachmentKey,
      url: msg.attachments[attachmentKey],
    };
  });

  this.logger.trace('Trying to get attachment...');

  const attachmentUrl = typeof attachments[0].url === 'string' 
    ? attachments[0].url 
    : attachments[0].url.url;
  
  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
  const attachmentResponse = await attachmentProcessor.getAttachment(attachmentUrl, 'stream');
  const fileStream = attachmentResponse.data;

  const fileName = msg.body.filename ? msg.body.filename : attachments[0].key.replace(/\//g, '');
  const { bucketName: actualBucketName, fullKey } = parseBucketAndKey(bucketNameInput, fileName);
  
  const result = await client.upload(actualBucketName, fullKey, fileStream);
  return messages.newMessageWithBody(result);
}
