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
  cfg.bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;

  await s3.deleteObject({
    Bucket: cfg.bucketName,
    Key: msg.body.filename,
  }).promise();

  this.emit('data', messages.newMessageWithBody({ filename: msg.body.filename }));
};
