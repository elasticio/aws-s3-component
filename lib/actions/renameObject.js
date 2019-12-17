/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

function formatFolder(folder) {
  if (folder) {
    if (folder.indexOf('/') === 0) {
      folder = folder.substring(1);
    }
    if (folder.substring(folder.length - 1) !== '/') {
      folder = `${folder}/`;
    }
  }
  return folder;
}

function checkFieldNotFolder(fieldName, fieldValue) {
  if (fieldValue.indexOf('/') > -1) {
    throw new Error(`${fieldName} shouldn't contains symbol '\\'`);
  }
}
// eslint-disable-next-line func-names
exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const { bucketName, oldFileName, newFileName } = msg.body;
  checkFieldNotFolder('bucketName', bucketName);
  checkFieldNotFolder('oldFileName', oldFileName);
  checkFieldNotFolder('newFileName', newFileName);
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
      const copyResult = await client.copyObject(copySource, bucketName, fullNewFileName);
      this.logger.trace(`copyResult ${JSON.stringify(copyResult)}`);
      newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
      this.logger.trace(`New file: ${JSON.stringify(newFile)}`);
      if (newFile) {
        this.logger.trace(`Starting delete old file: ${fullOldFileName}`);
        await client.deleteObject(bucketName, fullOldFileName);
        this.logger.info('File successfully renamed');
        await this.emit('data', messages.newMessageWithBody(newFile));
      } else {
        throw new Error(`Error occurred while copying a file: ${copyResult}`);
      }
    } else {
      this.logger.trace(`Exists file: ${JSON.stringify(newFile)}`);
      throw new Error(`File with name ${fullNewFileName} is already exists in bucket ${bucketName}`);
    }
  } else {
    throw new Error(`File with name ${fullOldFileName} doesn't exists in bucket ${bucketName}`);
  }
};
