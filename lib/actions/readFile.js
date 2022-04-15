/* eslint-disable no-use-before-define,consistent-return,func-names,no-param-reassign */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Readable } = require('stream');
const { messages } = require('elasticio-node');
const convert = require('xml-js');
const mime = require('mime-types');
const iconv = require('iconv-lite');
// const fs = require('fs');
const { Client } = require('../client');
const { REQUEST_MAX_BODY_LENGTH } = require('../parameters');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const { filename } = msg.body;

  const result = await client.getObject(bucketName, filename);

  if (result.ContentLength > REQUEST_MAX_BODY_LENGTH) {
    this.logger.error('File %s with size %d bytes is too big for attachment usage. '
      + 'Current attachment max size is %d bytes', filename, result.ContentLength, REQUEST_MAX_BODY_LENGTH);
    throw new Error(`File ${filename} with size ${result.ContentLength} bytes is too big for attachment usage. `
      + `Current attachment max size is ${REQUEST_MAX_BODY_LENGTH} bytes`);
  }

  const fileContent = iconv.decode(result.Body, 'iso-8859-15');
  const contentType = mime.lookup(filename);

  const encoded = result.Body.toString('utf-8');
  // const file = fs.createWriteStream('./aa.png');
  // file.pipe(formStream(encoded));

  if (contentType === 'application/json') {
    const jsonDoc = JSON.parse(fileContent);
    await this.emit('data', messages.newMessageWithBody(jsonDoc));
  } else if (contentType === 'application/xml') {
    const xmlDoc = JSON.parse(convert.xml2json(fileContent));
    await this.emit('data', messages.newMessageWithBody(xmlDoc));
  } else {
    const attachmentProcessor = new AttachmentProcessor();
    // const myStream = Readable.from(result.Body.toString());
    const response = await attachmentProcessor.uploadAttachment(result.Body, contentType);
    // const response2 = await attachmentProcessor.uploadAttachment(myStream, 'stream');
    const response2 = await attachmentProcessor.uploadAttachment(encoded, 'stream');
    const attachmentUrl = `${response.config.url}${response.data.objectId}?storage_type=maester`;
    const attachmentUrl2 = `${response2.config.url}${response2.data.objectId}?storage_type=maester`;
    msg.attachments = {
      [filename]: {
        url: attachmentUrl,
        url2: attachmentUrl2,
        size: fileContent.length,
        'content-type': contentType,
      },
    };
    const output = messages.newMessageWithBody(msg);
    output.attachments = msg.attachments;
    return output;
  }
};

const formStream = (data) => {
  const stream = new Readable();
  stream.push(data.toString());
  stream.push(null);
  return stream;
};
