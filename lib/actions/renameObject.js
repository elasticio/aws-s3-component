/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

function formatPrefix(prefix) {
  if (prefix.indexOf('/') === -1) {
    prefix = `${prefix}/`;
  }
  return prefix;
}

function formatBucketName(bucketName) {
  if (bucketName.indexOf('/') > -1) {
    const index = bucketName.indexOf('/');
    bucketName = bucketName.substring(0, index);
  }
  return bucketName;
}
// eslint-disable-next-line func-names
exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const { oldFileName, newFileName } = msg.body;
  const bucketName = formatBucketName(msg.body.bucketName);
  const prefix = formatPrefix(msg.body.prefix);
  this.logger.info(`Starting rename file ${oldFileName} to ${newFileName} in bucket: ${bucketName}`);
  const oldFile = await client.getFileFromBucket(bucketName, prefix, oldFileName);
  this.logger.trace(`Old file: ${JSON.stringify(oldFile)}`);
  if (oldFile) {
    let newFile = await client.getFileFromBucket(bucketName, prefix, newFileName);
    if (!newFile) {
      const copySource = `${bucketName}/${prefix || ''}${oldFileName}`;
      const newFileNamePrefix = `${prefix || ''}${newFileName}`;
      this.logger.trace(`Starting copyObject: ${copySource}`);
      await client.copyObject(copySource, bucketName, newFileNamePrefix);
      this.logger.trace(`Starting delete old file: ${oldFile}`);
      await client.deleteObject(bucketName, `${prefix || ''}${oldFileName}`);
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
