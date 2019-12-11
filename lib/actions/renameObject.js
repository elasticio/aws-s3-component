/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

function formatFolder(folder) {
  if (folder && folder.indexOf('/') === -1) {
    folder = `${folder}/`;
  }
  return folder;
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
  const folder = formatFolder(msg.body.folder);
  this.logger.info(`Found params oldFileName: ${oldFileName}, newFileName: ${newFileName}, bucketName: ${bucketName}, folder: ${folder}`);
  const fullOldFileName = `${folder || ''}${oldFileName}`;
  const fullNewFileName = `${folder || ''}${newFileName}`;
  this.logger.info(`Starting rename file ${fullOldFileName} to ${fullNewFileName} in bucket: ${bucketName}`);
  const oldFile = await client.getFileFromBucket(bucketName, fullOldFileName);
  this.logger.trace(`Old file: ${JSON.stringify(oldFile)}`);
  if (oldFile) {
    let newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
    if (!newFile) {
      const copySource = `${bucketName}/${fullOldFileName}`;
      this.logger.trace(`Starting copyObject: ${copySource}`);
      await client.copyObject(copySource, bucketName, fullNewFileName);
      this.logger.trace(`Starting delete old file: ${fullOldFileName}`);
      await client.deleteObject(bucketName, fullOldFileName);
      newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
      this.logger.trace(`New file: ${JSON.stringify(newFile)}`);
      this.logger.info('File successfully renamed');
      this.emit('data', messages.newMessageWithBody(newFile));
    } else {
      this.logger.trace(`Exists file: ${JSON.stringify(newFile)}`);
      throw new Error(`File with name ${fullNewFileName} is already exists in bucket ${bucketName}`);
    }
  } else {
    throw new Error(`File with name ${fullOldFileName} doesn't exists in bucket ${bucketName}`);
  }
};
