/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { Client } = require('../client');
const { createAWSInputs } = require('../utils/utils');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const awsInput = createAWSInputs(bucketName);
  const data = await client.listObjects(awsInput);
  data.Contents.forEach((c) => {
    this.emit('data', messages.newMessageWithBody({ filename: c.Key }));
  });
  this.emit('end');
};
