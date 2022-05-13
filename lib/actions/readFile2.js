/* eslint-disable no-use-before-define,consistent-return,func-names,no-param-reassign */
const { messages } = require('elasticio-node');
const convert = require('xml-js');
const mime = require('mime-types');
const iconv = require('iconv-lite');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Client } = require('../client');
const params = require('../parameters');


exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const { filename } = msg.body;

  // const result = await client.getObjectReadStream(bucketName, filename);
  const result = await client.getObjectMetadata(bucketName, filename);

  if (result.ContentLength > params.ATTACHMENT_MAX_SIZE) {
    const err = `File ${filename} with size ${result.ContentLength} bytes is too big for attachment usage. `
      + `Current attachment max size is ${params.ATTACHMENT_MAX_SIZE} bytes`;
    this.logger.error(err);
    throw new Error(err);
  }

  const contentType = mime.lookup(filename);
  this.logger.info(`File type - "${contentType}"`);

  if (['application/json', 'application/xml'].includes(contentType)) {
    const data = await client.getObject(bucketName, filename);
    const fileContent = iconv.decode(data.Body, 'iso-8859-15');
    let doc;
    if (contentType === 'application/json') doc = JSON.parse(fileContent);
    if (contentType === 'application/xml') doc = JSON.parse(convert.xml2json(fileContent));
    await this.emit('data', messages.newMessageWithBody(doc));
  } else {
    const readStream = client.getObjectReadStream(bucketName, filename);
    const results = await new AttachmentProcessor().uploadAttachment(readStream);
    const attachmentUrl = `${results.config.url}${results.data.objectId}?storage_type=maester`;

    const attachments = {
      [filename]: {
        url: attachmentUrl,
        size: result.ContentLength,
        'content-type': contentType,
      },
    };
    const output = messages.newMessageWithBody({
      filename,
      attachmentUrl,
      size: result.ContentLength,
    });
    output.attachments = attachments;
    return output;
  }
};
