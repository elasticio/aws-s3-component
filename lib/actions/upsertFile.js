/* eslint-disable func-names */
const { UpsertObjectById } = require('@elastic.io/oih-standard-library/lib/actions/upsert');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

const { Client } = require('../client');

class S3UpsertObject extends UpsertObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  getCriteria(msg, cfg) {
    return {
      bucketName: msg.body.bucketName,
      fileName: msg.body.fileName,
    };
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async getType(cfg, msg) {
    return 'file/S3 Object';
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async getObjectFromMessage(msg, cfg) {
    const fileStream = await new AttachmentProcessor().getAttachment(msg.body.attachmentUrl, 'stream');
    return fileStream.data;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async lookupObject(criteria, cfg) {
    return false;
  }

  async createObject(object, cfg, msg) {
    const { bucketName, fileName } = this.getCriteria(msg, cfg);
    return this.client.upload(bucketName, fileName, object);
  }
}


exports.process = async function (msg, cfg) {
  const s3Client = new Client(this.logger, cfg);
  const upsertObjectAction = new S3UpsertObject(this.logger, s3Client);
  return upsertObjectAction.process(msg, cfg);
};

exports.getMetaModel = async function (cfg) {
  const s3Client = new Client(this.logger, cfg);
  const bucketNames = await s3Client.listBucketNames();
  return {
    in: {
      type: 'object',
      required: true,
      properties: {
        bucketName: {
          title: 'Bucket Name',
          type: 'string',
          enum: bucketNames,
          required: true,
          order: 3,
        },
        fileName: {
          title: 'File Name (& any folders) (Key)',
          type: 'string',
          required: true,
          order: 2,
        },
        attachmentUrl: {
          title: 'Platform Attachment URL',
          type: 'string',
          required: true,
          order: 1,
        },
      },
    },
    out: {
      type: 'object',
      required: true,
    },
  };
};
