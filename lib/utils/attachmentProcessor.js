/* eslint-disable no-param-reassign */
const request = require('request');
const { Readable } = require('stream');
const { BasicAuthRestClient } = require('../StatelessBasicAuthRestClient');

function addAttachment(msg, name, body, contentType) {
  const self = this;
  async function getUrlsManualy() {
    const attachmentClient = new BasicAuthRestClient(self, {
      resourceServerUrl: 'http://api-service.platform.svc.cluster.local.:9000',
    }, process.env.ELASTICIO_API_USERNAME, process.env.ELASTICIO_API_KEY);

    return attachmentClient.makeRequest({
      method: 'POST',
      url: '/v2/resources/storage/signed-url',
    });
  }

  async function uploadFile(urls) {
    self.logger.debug('Trying to upload file...');

    const stream = new Readable();
    stream.push(body.toString());
    stream.push(null);
    await stream.pipe(request.put(urls.put_url));

    const msgLength = body.length;

    msg.attachments = {};
    msg.attachments[name] = {
      url: urls.get_url,
      size: msgLength,
      'content-type': contentType,
    };
    return msg;
  }

  return getUrlsManualy().then((result) => {
    self.logger.debug('Uploading file with content type %s ...', contentType);
    return uploadFile(result, contentType);
  });
}

exports.addAttachment = addAttachment;
