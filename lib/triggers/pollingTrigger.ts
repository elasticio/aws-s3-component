import { AwsS3Client, Credentials } from '../AwsS3Client';
import { AwsS3Polling } from '../utils/pollingUtil';

let client: AwsS3Client;

async function process(_msg: any, cfg: Credentials, snapshot?: any): Promise<void> {
  this.logger.trace('Starting pollingTrigger..');

  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const pollingTrigger = new AwsS3Polling(this, client, cfg);
  await pollingTrigger.process(cfg, snapshot);
}

async function getMetaModel(cfg: Credentials): Promise<any> {
  const metadataBase: any = {
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
  
  if (cfg.usePreSignedUrls) {
    metadataBase.preSignedUrl = { type: 'string', required: false };
  } else if (cfg.enableFileAttachments) {
    metadataBase.attachmentUrl = { type: 'string', required: false };
  }
  
  if (cfg.emitBehaviour === 'emitIndividually') {
    return { out: { type: 'object', properties: metadataBase } };
  }
  if (cfg.emitBehaviour === 'fetchAll') {
    return { out: { type: 'object', properties: { results: { type: 'array', items: metadataBase, required: true }, required: true } } };
  }
  return {};
}

export { getMetaModel, process };
