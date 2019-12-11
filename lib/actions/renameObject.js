/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const { bucketName, oldFileName, newFileName } = msg.body;
  this.logger.info(`Starting rename file ${oldFileName} to ${newFileName} in bucket: ${bucketName}`);
  const oldFile = await client.getFileFromBucket(bucketName, oldFileName);
  this.logger.trace(`Old file: ${JSON.stringify(oldFile)}`);
  if (oldFile) {
    let newFile = await client.getFileFromBucket(bucketName, newFileName);
    if (!newFile) {
      const copySource = `${bucketName}/${oldFileName}`;
      this.logger.trace(`Starting copyObject: ${copySource}`);
      await client.copyObject(copySource, bucketName, newFileName);
      this.logger.trace(`Starting delete old file: ${oldFile}`);
      await client.deleteObject(bucketName, oldFileName);
      newFile = await client.getFileFromBucket(bucketName, newFileName);
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
