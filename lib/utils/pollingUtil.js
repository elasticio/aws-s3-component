/* eslint-disable no-await-in-loop */
const { PollingTrigger } = require('@elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');

const { createAWSInputs } = require('../utils/utils');

class AwsS3Polling extends PollingTrigger {
  constructor(logger, context, client, cfg) {
    super(logger, context);
    this.client = client;
    this.cfg = cfg;
    this.attachmentProcessor = new AttachmentProcessor();
  }

  /* eslint-disable-next-line no-unused-vars */
  async getObjects(objectType, startTime, endTime, cfg) {
    const formattedStartTime = new Date(startTime);
    const formattedEndTime = new Date(endTime);
    const fileList = await this.client.listObjects(createAWSInputs(this.cfg.bucketName));

    return fileList.Contents
      .filter((file) => new Date(file.LastModified) >= formattedStartTime)
      .filter((file) => new Date(file.LastModified) < formattedEndTime);
  }

  async emitIndividually(files) {
    this.logger.info('Start emitting data');
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        this.logger.info('Processing file with name: %s, size: %d', file.Key, file.Size);
        const resultMessage = messages.newMessageWithBody(file);

        if (this.cfg.enableFileAttachments) {
          await this.s3FileToAttachment(resultMessage, file.Key);
        }

        this.logger.trace('Emitting new message with body: %j', resultMessage.body);
        await this.context.emit('data', resultMessage);
      } catch (e) {
        await this.context.emit('error', e);
      }
    }
    this.logger.debug('Finished emitting data');
  }

  async emitAll(results) {
    this.logger.info('Files number were found: %d', results.length);

    const resultMessage = messages.newMessageWithBody({ results });

    if (this.cfg.enableFileAttachments) {
      const attachments = {};

      for (let i = 0; i < results.length; i += 1) {
        const dummyMessage = messages.newEmptyMessage();
        await this.s3FileToAttachment(dummyMessage, results[i].Key);
        attachments[results[i].Key] = dummyMessage.attachments[results[i].Key];
      }

      resultMessage.attachments = attachments;
    }

    this.logger.trace('Emitting new message with body: %j', resultMessage.body);
    await this.context.emit('data', resultMessage);
    this.logger.info('Finished emitting data');
  }

  async s3FileToAttachment(msg, filename) {
    this.logger.info('Adding file %s to attachment...', filename);
    const s3Stream = this.client.getObjectReadStream(this.cfg.bucketName, filename);
    return this.attachmentProcessor.uploadAttachment(s3Stream);
  }
}

exports.AwsS3Polling = AwsS3Polling;
