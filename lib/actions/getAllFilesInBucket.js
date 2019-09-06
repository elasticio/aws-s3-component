/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const aws = require('aws-sdk');

exports.process = async function (msg, cfg) {
  const s3 = new aws.S3({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.accessKeySecret,
    region: cfg.region
  });

  // eslint-disable-next-line no-param-reassign
  cfg.bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
 
  // eslint-disable-next-line no-use-before-define
  const data = await s3.listObjects(createAWSInputs(cfg.bucketName)).promise();
  data.Contents.forEach((c) => {
    this.emit('data', messages.newMessageWithBody({ filename: c.Key }));
  });
  this.emit('end');
};

function createAWSInputs(bucketName) {
  if (bucketName.indexOf('/') > -1) {
    const index = bucketName.indexOf('/');
    const folder = `${bucketName.substring(index + 1)}/`;
    const bucket = bucketName.substring(0, index);
    return { Bucket: bucket, Delimiter: '/', Prefix: folder };
  }
  return { Bucket: bucketName } ; 
}
