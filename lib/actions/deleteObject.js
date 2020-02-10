/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;

  try {
    await client.getObjectMetadata(bucketName, msg.body.filename);
  } catch (err) {
    if (err.code === 'NotFound') {
      this.logger.warn('Provided filename is not found: nothing to delete');
      return messages.newEmptyMessage();
    }
    this.logger.error('Error occurred while getting file metadata: %j', err);
    throw err;
  }

  this.logger.info('Provided filename is found: deleting...');
  await client.deleteObject(bucketName, msg.body.filename);
  return messages.newMessageWithBody({ filename: msg.body.filename });
};
