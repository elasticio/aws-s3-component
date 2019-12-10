/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const aws = require('aws-sdk');

async function getFileFromBucket(s3, bucketName, filename) {
  const data = await s3.listObjects({ Bucket: bucketName, Delimiter: '/', Prefix: filename }).promise();
  const foundFiles = data.Contents.filter(item => item.Key === filename);
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
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const { oldFileName, newFileName } = msg.body;

  const oldFile = await getFileFromBucket(s3, bucketName, oldFileName);
  if (oldFile) {
    let newFile = await getFileFromBucket(s3, bucketName, newFileName);
    if (!newFile) {
      const params = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldFileName}`,
        Key: newFileName,
      };
      await s3.copyObject(params).promise();
      await s3.deleteObject({ Bucket: bucketName, Key: oldFileName }).promise();
      newFile = await getFileFromBucket(s3, bucketName, newFileName);
      this.emit('data', messages.newMessageWithBody(newFile));
    } else {
      throw new Error(`File with name ${newFileName} is already exists`);
    }
  } else {
    throw new Error(`File with name ${oldFileName} doesn't exists`);
  }
};
