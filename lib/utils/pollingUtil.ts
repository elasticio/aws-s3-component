import { AttachmentProcessor } from '@elastic.io/component-commons-library';
import * as path from 'path';
import { AwsS3Client, S3Object, Credentials } from '../AwsS3Client';
import { createAWSInputs, getUserAgent, messages } from './utils';
import * as params from '../parameters';

/**
 * Polling trigger for AWS S3 that handles snapshot management and processing logic.
 * This replaces the dependency on @elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated
 * while maintaining backwards compatibility.
 */
const isDebugFlow = process.env.ELASTICIO_FLOW_TYPE === 'debug';

export class AwsS3Polling {
  private client: AwsS3Client;

  private cfg: Credentials;

  private attachmentProcessor: AttachmentProcessor;

  private logger: any;

  private context: any;

  constructor(context: any, client: AwsS3Client, cfg: Credentials) {
    this.logger = context.logger;
    this.context = context;
    this.client = client;
    this.cfg = cfg;
    this.attachmentProcessor = new AttachmentProcessor(getUserAgent());
  }

  async process(cfg: Credentials, snapshot?: any): Promise<void> {
    try {
      this.logger.info('Starting processing Polling trigger');
      
      // Initialize snapshot if not provided
      const currentSnapshot = snapshot || {};
      
      const timeStampFlowRun = new Date();
      const startTime = this.getStartTime(cfg, currentSnapshot);
      const endTime = this.getEndTime(cfg, timeStampFlowRun);
      const emitBehaviour = this.getEmitBehaviour(cfg);

      this.logger.debug('Polling with startTime: %s, endTime: %s', startTime, endTime);

      if (startTime >= endTime) {
        this.logger.warn('Start Time (%s) must be before End Time (%s). No objects will be returned.', startTime, endTime);
      }

      switch (emitBehaviour) {
        case 'emitIndividually': {
          this.logger.debug('Start object polling');
          const result = await this.getObjects({ startTime, endTime });
          this.logger.debug('Finish object polling');
          if (result === undefined || result === null || result.length === 0) {
            this.logger.info('No new or updated objects found in the specified time range (Start: %s, End: %s)', startTime.toISOString(), endTime.toISOString());
            if (isDebugFlow) {
              throw new Error(`No object found. Execution stopped.
              This error is only applicable to the Retrieve Sample.
              In flow executions there will be no error, just an execution skip.`);
            }
            break;
          }
          // Update snapshot startTime before emitting
          currentSnapshot.startTime = timeStampFlowRun;
          await this.emitIndividually(result);
          break;
        }
        case 'fetchAll': {
          this.logger.debug('Start object polling');
          const result = await this.getObjects({ startTime, endTime });
          this.logger.debug('Finish object polling');
          if (result === undefined || result === null || result.length === 0) {
            this.logger.info('No new or updated objects found in the specified time range (Start: %s, End: %s)', startTime.toISOString(), endTime.toISOString());
            if (isDebugFlow) {
              throw new Error(`No object found. Execution stopped.
              This error is only applicable to the Retrieve Sample.
              In flow executions there will be no error, just an execution skip.`);
            }
            break;
          }
          // Update snapshot startTime before emitting
          currentSnapshot.startTime = timeStampFlowRun;
          await this.emitAll(result);
          break;
        }
        default:
          throw new Error(`Unexpected emit behaviour: ${emitBehaviour}`);
      }
      
      this.logger.debug('Start emitting snapshot');
      await this.context.emit('snapshot', currentSnapshot);
      this.logger.debug('Finish emitting snapshot');
      this.logger.info('Finished processing call to Polling Trigger');
    } catch (e) {
      this.logger.error('Unexpected error while processing Polling Trigger call');
      throw e;
    }
  }

  /**
   * Get start time for polling.
   * Defaults to snapshot.startTime, or cfg.startTime, or MIN_DATE (epoch start).
   */
  private getStartTime(cfg: any, snapshot: any): Date {
    const MIN_DATE = new Date(0); // Epoch start
    if (snapshot?.startTime) {
      const date = new Date(snapshot.startTime);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid "Start Time" value');
      }
      return date;
    }
    if (cfg.startTime) {
      const date = new Date(cfg.startTime);
      if (Number.isNaN(date.getTime())) {
        throw new Error('Invalid "Start Time" value');
      }
      return date;
    }
    return MIN_DATE;
  }

  /**
   * Get end time for polling.
   * Defaults to timeStampFlowRun, or cfg.endTime if provided and valid.
   */
  private getEndTime(cfg: any, timeStampFlowRun: Date): Date {
    if (!cfg.endTime) {
      return timeStampFlowRun;
    }
    const cfgDate = new Date(cfg.endTime);
    if (Number.isNaN(cfgDate.getTime())) {
      throw new Error('Invalid "End Time" value');
    }
    return cfgDate < timeStampFlowRun ? cfgDate : timeStampFlowRun;
  }

  /**
   * Get emit behaviour from configuration.
   * Defaults to 'emitIndividually' if not specified.
   */
  private getEmitBehaviour(cfg: Credentials): string {
    return cfg.emitBehaviour || 'emitIndividually';
  }

  async getObjects({ startTime, endTime }: { startTime: Date; endTime: Date }): Promise<S3Object[]> {
    this.logger.debug('Fetching objects from bucket with time range: startTime=%s, endTime=%s', startTime.toISOString(), endTime.toISOString());
    const fileList = await this.client.listObjects(createAWSInputs(this.cfg.bucketName));

    return fileList
      .filter((file) => file.Key.slice(-1) !== '/')
      .filter((file) => new Date(file.LastModified) >= startTime)
      .filter((file) => new Date(file.LastModified) < endTime);
  }

  async emitIndividually(files: S3Object[]): Promise<void> {
    this.logger.info('Start emitting data');
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      this.logger.info('Processing file with size: %d', file.Size);
      const resultMessage: any = messages.newMessageWithBody(file);

      if (this.cfg.usePreSignedUrls === true) {
        const expirationSeconds = this.cfg.preSignedUrlExpiration || 3600;
        this.logger.info('Generating pre-signed URL for file: %s', file.Key);
        const awsInput = createAWSInputs(this.cfg.bucketName);
        const preSignedUrl = await this.client.getSignedUrl(awsInput.Bucket, file.Key, expirationSeconds);
        resultMessage.body.preSignedUrl = preSignedUrl;
      } else if (this.cfg.enableFileAttachments) {
        // Use attachment (original behavior)
        if (file.Size > params.ATTACHMENT_MAX_SIZE) {
          const err = `File "${file.Key}" with size ${file.Size} bytes is too big for attachment usage. `
            + `Current ATTACHMENT_MAX_SIZE is ${params.ATTACHMENT_MAX_SIZE} bytes. `
            + `Consider enabling "Use Pre-signed URLs" for larger files.`;
          this.logger.error(err);
          throw new Error(err);
        }
        await this.s3FileToAttachment(resultMessage, file.Key, file.Size);
        const attachmentKey = path.basename(file.Key);
        resultMessage.body.attachmentUrl = resultMessage.attachments[attachmentKey]?.url;
      }

      this.logger.trace('Emitting new message with data...');
      await this.context.emit('data', resultMessage);
    }
    this.logger.debug('Finished emitting data');
  }

  async emitAll(results: S3Object[]): Promise<void> {
    this.logger.info('Files number were found: %d', results.length);

    const resultMessage: any = messages.newMessageWithBody({ results });

    if (this.cfg.usePreSignedUrls === true) {
      const expirationSeconds = this.cfg.preSignedUrlExpiration || 3600;
      const awsInput = createAWSInputs(this.cfg.bucketName);
      for (let i = 0; i < results.length; i += 1) {
        this.logger.info('Generating pre-signed URL for file: %s', results[i].Key);
        const preSignedUrl = await this.client.getSignedUrl(awsInput.Bucket, results[i].Key, expirationSeconds);
        resultMessage.body.results[i].preSignedUrl = preSignedUrl;
      }
    } else if (this.cfg.enableFileAttachments) {
      const attachments: { [key: string]: any } = {};

      for (let i = 0; i < results.length; i += 1) {
        if (results[i].Size > params.ATTACHMENT_MAX_SIZE) {
          const err = `File "${results[i].Key}" with size ${results[i].Size} bytes is too big for attachment usage. `
            + `Current ATTACHMENT_MAX_SIZE is ${params.ATTACHMENT_MAX_SIZE} bytes. `
            + `Consider enabling "Use Pre-signed URLs" for larger files.`;
          this.logger.error(err);
          throw new Error(err);
        }
        const dummyMessage: any = messages.newEmptyMessage();
        await this.s3FileToAttachment(dummyMessage, results[i].Key, results[i].Size);
        const attachmentKey = path.basename(results[i].Key);
        attachments[attachmentKey] = dummyMessage.attachments[attachmentKey];
        resultMessage.body.results[i].attachmentUrl = dummyMessage.attachments[attachmentKey]?.url;
      }

      resultMessage.attachments = attachments;
    }

    this.logger.trace('Emitting new message with data...');
    await this.context.emit('data', resultMessage);
  }

  async s3FileToAttachment(msg: any, fileKey: string, size: number): Promise<void> {
    this.logger.info('Adding file to attachment...');
    const awsInput = createAWSInputs(this.cfg.bucketName);
    const getAttachment = async () => this.client.getObjectReadStream(awsInput.Bucket, fileKey);
    const attachmentId = await this.attachmentProcessor.uploadAttachment(getAttachment);
    this.logger.info('File successfully uploaded to attachment storage');
    const attachmentUrl = this.attachmentProcessor.getMaesterAttachmentUrlById(attachmentId);
    const attachmentKey = path.basename(fileKey);
    msg.attachments = {
      [attachmentKey]: {
        url: attachmentUrl,
        size,
      },
    };
  }
}