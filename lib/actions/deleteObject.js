/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { Client } = require('../client');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  await client.deleteObject(bucketName, msg.body.filename);
  this.emit('data', messages.newMessageWithBody({ filename: msg.body.filename }));
};
