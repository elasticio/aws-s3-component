/* eslint-disable no-use-before-define,consistent-return,func-names */
const { messages } = require('elasticio-node');
const convert = require('xml-js');
const mime = require('mime-types');
const iconv = require('iconv-lite');
const { Client } = require('../client');

const attachmentProcessor = require('../utils/attachmentProcessor');

exports.process = async function (msg, cfg) {
  const client = new Client(this.logger, cfg);
  const bucketName = msg.body.bucketName ? msg.body.bucketName : cfg.bucketName;
  const { filename } = msg.body;

  const result = await client.getObject(bucketName, filename);

  const fileContent = iconv.decode(result.Body, 'iso-8859-15');
  const contentType = mime.lookup(filename);

  if (contentType === 'application/json') {
    const jsonDoc = JSON.parse(fileContent);
    await this.emit('data', messages.newMessageWithBody(jsonDoc));
  } else if (contentType === 'application/xml') {
    const xmlDoc = JSON.parse(convert.xml2json(fileContent));
    await this.emit('data', messages.newMessageWithBody(xmlDoc));
  } else {
    const response = await attachmentProcessor.addAttachment(msg, filename,
      fileContent, contentType);
    const output = messages.newMessageWithBody(response);
    output.attachments = response.attachments;
    return output;
  }
};
