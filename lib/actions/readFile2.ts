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
    const err = `File ${filename} with size ${result.ContentLength} bytes is too big for attachment usage. `
      + `Current attachment max size is ${params.ATTACHMENT_MAX_SIZE} bytes`;
    this.logger.error(err);
    throw new Error(err);
  }

  const contentType = mime.lookup(filename) ?? 'application/octet-stream';
  this.logger.info(`File type - "${contentType}"`);

  if (['application/json', 'application/xml'].includes(contentType)) {
    const dataBuffer = await toBuffer(result.Body);
    const fileContent = iconv.decode(dataBuffer, 'iso-8859-15');
    let doc: any;
    if (contentType === 'application/json') doc = JSON.parse(fileContent);
    if (contentType === 'application/xml') doc = JSON.parse(convert.xml2json(fileContent));
    return messages.newMessageWithBody(doc);
  } else {
    const usePreSignedUrls = cfg.usePreSignedUrls === true;
    const expirationSeconds = cfg.preSignedUrlExpiration || 3600;

    if (usePreSignedUrls) {
      this.logger.info('Generating pre-signed URL for file');
      const preSignedUrl = await client.getSignedUrl(actualBucketName, fullKey, expirationSeconds);
      
      const output = messages.newMessageWithBody({
        filename,
        preSignedUrl,
        size: result.ContentLength,
      });
      return output;
    } else {
      if ((result.ContentLength || 0) > params.ATTACHMENT_MAX_SIZE) {
        const err = `File ${filename} with size ${result.ContentLength} bytes is too big for attachment usage. ` 
          + `Current attachment max size is ${params.ATTACHMENT_MAX_SIZE} bytes. ` 
          + `Consider enabling "Use Pre-signed URLs" for larger files.`;
        this.logger.error(err);
        throw new Error(err);
      }

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
}