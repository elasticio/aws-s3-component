/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { Client } = require('../client');
const { createAWSInputs } = require('../utils/utils');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  if (!bucketName) {
    throw new Error(`Bucket name cant be empty. Provided bucket name: ${bucketName}`);
  }
  const awsInput = createAWSInputs(bucketName);
  const exist = await client.exist(awsInput);
  if (!exist) {
    throw new Error(`Bucket ${bucketName} not exist`);
  }
  const data = await client.listObjects(awsInput);
  if (data.length === 0) {
    this.emit('data', messages.newEmptyMessage());
  }
  data.forEach((c) => {
    this.emit('data', messages.newMessageWithBody({ filename: c.Key }));
  });
  this.emit('end');
};
