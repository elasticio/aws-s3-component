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
  this.logger.info('Starting rename object action...');
  const client = new Client(this.logger, cfg);
  const { bucketName, oldFileName, newFileName } = msg.body;
  checkFieldNotFolder('bucketName', bucketName);
  checkFieldNotFolder('oldFileName', oldFileName);
  checkFieldNotFolder('newFileName', newFileName);
  const folder = formatFolder(msg.body.folder);
  const fullOldFileName = `${folder || ''}${oldFileName}`;
  const fullNewFileName = `${folder || ''}${newFileName}`;
  const oldFile = await client.getFileFromBucket(bucketName, fullOldFileName);
  if (oldFile) {
    let newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
    if (!newFile) {
      const copySource = `${bucketName}/${fullOldFileName}`;
      this.logger.trace('Starting copyObject...');
      const copyResult = await client.copyObject(copySource, bucketName, fullNewFileName);
      this.logger.trace('CopyResult received');
      newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
      if (newFile) {
        this.logger.trace('Starting delete old file...');
        await client.deleteObject(bucketName, fullOldFileName);
        this.logger.info('File successfully renamed');
        await this.emit('data', messages.newMessageWithBody(newFile));
      } else {
        throw new Error(`Error occurred while copying a file: ${copyResult}`);
      }
    } else {
      throw new Error('File is already exists in provided bucket!');
    }
  } else {
    throw new Error(`File with name ${fullOldFileName} doesn't exists in bucket ${bucketName}`);
  }
};
