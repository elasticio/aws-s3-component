/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

function formatPrefix(prefix) {
  if (prefix && prefix.indexOf('/') === -1) {
    prefix = `${prefix}/`;
  }
  return prefix;
}

function checkBucketName(bucketName) {
  if (bucketName.indexOf('/') > -1) {
    throw new Error('Bucket name shouldn\'t contains symbol \'/\'');
  }
}
// eslint-disable-next-line func-names
exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const { bucketName, oldFileName, newFileName } = msg.body;
  checkBucketName(bucketName);
  const prefix = formatPrefix(msg.body.prefix);
  const fullOldFileName = `${prefix || ''}${oldFileName}`;
  const fullNewFileName = `${prefix || ''}${newFileName}`;
  this.logger.info(`Starting rename file ${oldFileName} to ${newFileName} in bucket: ${bucketName}`);
  const oldFile = await client.getFileFromBucket(bucketName, prefix, oldFileName);
  this.logger.trace(`Old file: ${JSON.stringify(oldFile)}`);
  if (oldFile) {
    let newFile = await client.getFileFromBucket(bucketName, prefix, newFileName);
    if (!newFile) {
      const copySource = `${bucketName}/${fullOldFileName}`;
      this.logger.trace(`Starting copyObject: ${copySource}`);
      await client.copyObject(copySource, bucketName, fullNewFileName);
      this.logger.trace(`Starting delete old file: ${oldFile}`);
      await client.deleteObject(bucketName, fullOldFileName);
      newFile = await client.getFileFromBucket(bucketName, prefix, newFileName);
      this.logger.trace(`New file: ${JSON.stringify(newFile)}`);
      this.logger.info('File successfully renamed');
      this.emit('data', messages.newMessageWithBody(newFile));
    } else {
      this.logger.trace(`Exists file: ${JSON.stringify(newFile)}`);
      this.logger.info(`File with name ${newFileName} is already exists`);
      throw new Error(`File with name ${newFileName} is already exists`);
    }
  } else {
    this.logger.info(`File with name ${oldFileName} doesn't exists`);
    throw new Error(`File with name ${oldFileName} doesn't exists`);
  }
};
