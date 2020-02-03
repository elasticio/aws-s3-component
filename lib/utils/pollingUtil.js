/* eslint-disable no-await-in-loop */
const { PollingTrigger } = require('@elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated');
const { messages } = require('elasticio-node');

const { createAWSInputs } = require('../utils/utils');

class AwsS3Polling extends PollingTrigger {
  constructor(logger, context, client, cfg) {
    super(logger, context);
    this.client = client;
    this.cfg = cfg;
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
    this.logger.debug('Start emitting data');

    if (files.length === 0) {
      this.logger.trace('Have not found files in the bucket %s', this.cfg.bucketName);
      return;
    }
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        this.logger.debug('Processing file with name: %s, size: %d', file.Key, file.Size);
        const resultMessage = messages.newMessageWithBody(file);
        this.logger.trace('Emitting new message with body: %j', resultMessage.body);
        await this.context.emit('data', resultMessage);
      } catch (e) {
        await this.context.emit('error', e);
      }
    }
    this.logger.debug('Finished emitting data');
  }

  async emitAll(results) {
    this.logger.debug('Start emitting data');
    if (results === null || results === undefined || results.length === 0) {
      this.logger.trace('Not emitting result with empty body, results was: %j', results);
      return;
    }

    const resultMessage = messages.newMessageWithBody({ results });
    this.logger.trace('Emitting new message with body: %j', resultMessage.body);
    await this.context.emit('data', resultMessage);
    this.logger.debug('Finished emitting data');
  }
}

exports.AwsS3Polling = AwsS3Polling;
