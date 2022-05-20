const { Client } = require('../client');
const { AwsS3Polling } = require('../utils/pollingUtil');

async function process(_msg, cfg, snapshot) {
  const client = new Client(this.logger, cfg);

  const pollingTrigger = new AwsS3Polling(this.logger, this, client, cfg);
  await pollingTrigger.process(cfg, snapshot);
}

async function getMetaModel(cfg) {
  const metadataBase = {
    attachmentUrl: { type: 'string', required: true },
    Key: { type: 'string', required: true },
    LastModified: { type: 'string', required: true },
    ETag: { type: 'string', required: true },
    Size: { type: 'number', required: true },
    StorageClass: { type: 'string', required: true },
    Owner: {
      type: 'object',
      properties: { ID: { type: 'string', required: true } },
    },
  };
  if (cfg.emitBehaviour === 'emitIndividually') {
    return { out: { type: 'object', properties: metadataBase } };
  }
  if (cfg.emitBehaviour === 'fetchAll') {
    return { out: { type: 'object', properties: { results: { type: 'array', items: metadataBase, required: true }, required: true } } };
  }
  return {};
}

module.exports.getMetaModel = getMetaModel;
module.exports.process = process;
