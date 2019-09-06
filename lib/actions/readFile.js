/* eslint-disable no-use-before-define,consistent-return,func-names */
const { messages } = require('elasticio-node');
const aws = require('aws-sdk');
const convert = require('xml-js');
const mime = require('mime-types');
const iconv = require('iconv-lite');

const attachmentProcessor = require('../utils/attachmentProcessor');

exports.process = async function (msg, cfg) {
  const s3 = new aws.S3({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.accessKeySecret,
    region: cfg.region
  });

  // eslint-disable-next-line no-param-reassign
  cfg.bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;

  const result = await s3.getObject({
    Bucket: cfg.bucketName,
    Key: msg.body.filename,
  }).promise();

  const fileContent = iconv.decode(result.Body, 'iso-8859-15');
  const contentType = mime.lookup(msg.body.filename);

  if (contentType === 'application/json') {
    const jsonDoc = JSON.parse(fileContent);
    this.emit('data', messages.newMessageWithBody(jsonDoc));
  } else if (contentType === 'application/xml') {
    const xmlDoc = JSON.parse(convert.xml2json(fileContent));
    this.emit('data', messages.newMessageWithBody(xmlDoc));
  } else {
    const response = await attachmentProcessor.addAttachment(msg, msg.body.filename,
      fileContent, contentType);
    const output = messages.newMessageWithBody(response);
    output.attachments = response.attachments;
    return output;
  }
};
