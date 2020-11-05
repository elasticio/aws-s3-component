/* eslint-disable no-await-in-loop */
const { PollingTrigger } = require('@elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');
const path = require('path');

const { createAWSInputs } = require('./utils');

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

    return fileList
      .filter((file) => file.Key.slice(-1) !== '/')
      .filter((file) => new Date(file.LastModified) >= formattedStartTime)
      .filter((file) => new Date(file.LastModified) < formattedEndTime);
  }

  async emitIndividually(files) {
    this.logger.info('Start emitting data');
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        this.logger.info('Processing file with size: %d', file.Size);
        const resultMessage = messages.newMessageWithBody(file);

        if (this.cfg.enableFileAttachments) {
          await this.s3FileToAttachment(resultMessage, path.basename(file.Key), file.Size);
        }

        this.logger.trace('Emitting new message with data...');
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
        await this.s3FileToAttachment(dummyMessage, path.basename(results[i].Key), results[i].Size);
        attachments[results[i].Key] = dummyMessage.attachments[results[i].Key];
      }

      resultMessage.attachments = attachments;
    }

    this.logger.trace('Emitting new message with data...');
    await this.context.emit('data', resultMessage);
    this.logger.info('Finished emitting data');
  }

  async s3FileToAttachment(msg, filename, size) {
    this.logger.info('Adding file to attachment...');
    const s3Stream = this.client.getObjectReadStream(this.cfg.bucketName, filename);
    const uploadResult = await this.attachmentProcessor.uploadAttachment(s3Stream);
    this.logger.info('File successfully uploaded to attachment storage');

    /* eslint-disable-next-line no-param-reassign */
    msg.attachments = {
      [filename]: {
        url: uploadResult.config.url,
        size,
      },
    };

    return uploadResult;
  }
}

exports.AwsS3Polling = AwsS3Polling;
