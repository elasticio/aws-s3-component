/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const aws = require('aws-sdk');
const bunyan = require('bunyan');

const logger = bunyan.createLogger({ name: 'renameObject' });

async function getFileFromBucket(s3, bucketName, filename) {
  logger.info(`Finding file ${filename} in bucket: ${bucketName}`);
  const data = await s3.listObjects({ Bucket: bucketName, Delimiter: '/', Prefix: filename }).promise();
  logger.trace(`Found data: ${JSON.stringify(data)}`);
  const foundFiles = data.Contents.filter(item => item.Key === filename);
  logger.trace(`Found file: ${JSON.stringify(foundFiles)}`);
  if (foundFiles.length !== 1) {
    return null;
  }
  return foundFiles[0];
}

exports.process = async function (msg, cfg) {
  const s3 = new aws.S3({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.accessKeySecret,
    region: cfg.region,
  });
  const { bucketName, oldFileName, newFileName } = msg.body;
  logger.info(`Starting rename file ${oldFileName} to ${newFileName} in bucket: ${bucketName}`);
  const oldFile = await getFileFromBucket(s3, bucketName, oldFileName);
  logger.trace(`Old file: ${JSON.stringify(oldFile)}`);
  if (oldFile) {
    let newFile = await getFileFromBucket(s3, bucketName, newFileName);
    if (!newFile) {
      const params = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldFileName}`,
        Key: newFileName,
      };
      logger.trace(`Starting copyObject with params: ${JSON.stringify(params)}`);
      await s3.copyObject(params).promise();
      logger.trace(`Starting delete old file: ${oldFile}`);
      await s3.deleteObject({ Bucket: bucketName, Key: oldFileName }).promise();
      newFile = await getFileFromBucket(s3, bucketName, newFileName);
      logger.trace(`New file: ${JSON.stringify(newFile)}`);
      logger.info('File successfully renamed');
      this.emit('data', messages.newMessageWithBody(newFile));
    } else {
      logger.trace(`Exists file: ${JSON.stringify(newFile)}`);
      logger.info(`File with name ${newFileName} is already exists`);
      throw new Error(`File with name ${newFileName} is already exists`);
    }
  } else {
    logger.info(`File with name ${oldFileName} doesn't exists`);
    throw new Error(`File with name ${oldFileName} doesn't exists`);
  }
};
