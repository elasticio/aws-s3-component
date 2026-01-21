import { AwsS3Client, Credentials } from '../AwsS3Client';
import { messages, getUserAgent, parseBucketAndKey, toBuffer } from '../utils/utils';
import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import convert from 'xml-js';
import mime from 'mime-types';
import iconv from 'iconv-lite';
import * as params from '../parameters';
import { AttachmentProcessor } from '@elastic.io/component-commons-library';

let client: AwsS3Client;  

export async function process(this: any, msg: any, cfg: Credentials): Promise<any> {
  this.logger.info('Starting "Read File" action..');

  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const bucketNameInput = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  if (!bucketNameInput) {
    throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketNameInput}`);
  }
  const { filename } = msg.body;
  const { bucketName: actualBucketName, fullKey } = parseBucketAndKey(bucketNameInput, filename);

  let result: GetObjectCommandOutput | null = null;
  try {
    result = await client.getObject(actualBucketName, fullKey);
  } catch (error) {
    throw new Error(`Error getting object from bucket ${bucketNameInput}: ${error}`);
  }

  if ((result.ContentLength || 0) > params.ATTACHMENT_MAX_SIZE) {
    this.logger.error('File %s with size %d bytes is too big for attachment usage. '
      + 'Current attachment max size is %d bytes', filename, result.ContentLength, params.ATTACHMENT_MAX_SIZE);
    throw new Error(`File ${filename} with size ${result.ContentLength} bytes is too big for attachment usage. `
      + `Current attachment max size is ${params.ATTACHMENT_MAX_SIZE} bytes`);
  }

  const contentType = mime.lookup(filename) ?? 'application/octet-stream';
  const fileBuffer = await toBuffer(result.Body);
  const fileContent = iconv.decode(fileBuffer, 'iso-8859-15');

  if (contentType === 'application/json') {
    const jsonDoc = JSON.parse(fileContent);
    return messages.newMessageWithBody(jsonDoc);
  } else if (contentType === 'application/xml') {
    const xmlDoc = JSON.parse(convert.xml2json(fileContent));
    return messages.newMessageWithBody(xmlDoc);
  } else {
    const getAttachment = async () => client.getObjectReadStream(actualBucketName, fullKey);
    const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
    const attachmentId = await attachmentProcessor.uploadAttachment(getAttachment);
    const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(attachmentId);

    const attachments = {
      [filename]: {
        url: attachmentUrl,
        size: result.ContentLength,
        'content-type': contentType,
      },
    };
    const output = messages.newMessageWithBody({
      filename,
      attachmentUrl,
      size: result.ContentLength,
    });
    output.body.attachments = attachments;
    return output;
  }
}