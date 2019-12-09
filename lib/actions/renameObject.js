/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const aws = require('aws-sdk');

exports.process = async function (msg, cfg) {
  const s3 = new aws.S3({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.accessKeySecret,
    region: cfg.region,
  });

  // eslint-disable-next-line no-param-reassign
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const { oldFileName, newFileName } = msg.body;

  const params = {
    Bucket: bucketName,
    CopySource: `${bucketName}/${oldFileName}`,
    Key: newFileName,
  };
  await s3.copyObject(params);
  await s3.deleteObject({
    Bucket: bucketName,
    Key: oldFileName,
  }).promise();
  this.emit('data', messages.newMessageWithBody({ filename: msg.body.filename }));
};
