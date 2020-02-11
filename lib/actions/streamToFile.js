/* eslint-disable func-names */
const { messages } = require('elasticio-node');
const { PassThrough } = require('stream');
const { Client } = require('../client');

const { NoAuthRestClient } = require('../StatelessBasicAuthRestClient');

exports.process = async function (msg, cfg) {
  this.logger.trace('Input: %j', JSON.stringify(msg));
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;

  if (!msg.attachments) {
    throw new Error('Message has no attachments object (no attachments)');
  } else if (Object.keys(msg.attachments).length > 1) {
    throw new Error('More than 1 attachment');
  } else if (Object.keys(msg.attachments).length === 0) {
    throw new Error('Has no attachment');
  }
  // eslint-disable-next-line arrow-body-style
  const attachments = Object.keys(msg.attachments).map((attachmentKey) => {
    return {
      key: attachmentKey,
      url: msg.attachments[attachmentKey],
    };
  });

  this.logger.trace('trying to get attachment from %j', attachments[0].url.url);

  const passthrough = new PassThrough();

  const attachmentClient = new NoAuthRestClient(this, {});
  const attachmentContent = attachmentClient.getRequest()({
    method: 'GET',
    url: attachments[0].url.url,
    isJson: false,
    urlIsSegment: false,
  }, 5, passthrough);

  if (attachmentContent) {
    attachmentContent.pipe(passthrough);
  }

  const fileName = msg.body.filename ? msg.body.filename : attachments[0].key.replace(/\//g, '');
  const result = await client.upload(bucketName, fileName, passthrough);
  await this.emit('data', messages.newMessageWithBody(result));
};
