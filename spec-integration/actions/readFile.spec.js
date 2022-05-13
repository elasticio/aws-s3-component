/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const bunyan = require('bunyan');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

process.env.ATTACHMENT_MAX_SIZE = 100000000;

const readFile = require('../../lib/actions/readFile');
// const { BasicAuthRestClient } = require('../../lib/StatelessBasicAuthRestClient');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev/test',
};

const defaultMsg = {};

const logger = bunyan.createLogger({ name: 'readFile', level: 'info' });

const self = {
  emit: sinon.spy(),
  logger,
};

describe('readFile', () => {
  let cfg;
  let msg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  afterEach(() => self.emit.resetHistory());

  it('should read XML', async () => {
    msg.body = { filename: 'LU0326731121.xml' };
    await readFile.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];
    const expectedDeclaration = {
      attributes: {
        encoding: 'UTF-8',
        version: '1.0',
      },
    };

    expect(result.body.declaration).to.deep.equal(expectedDeclaration);
  });

  describe('reads file types other than XML or JSON by using attachmentProcessor', () => {
    let authClientStub;
    before(() => {
      authClientStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment');
      authClientStub.returns({
        config: { url: 'https://storage/' },
        data: { objectId: 'objectId' },
      });
    });
    after(() => authClientStub.restore());

    it('should read CSV 1', async () => {
      msg.body = { filename: 'Depotumsätze.csv' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'Depotumsätze.csv': {
          url: 'https://storage/objectId?storage_type=maester',
          size: 13911,
          'content-type': 'text/csv',
        },
      };
      expect(result.attachments).to.deep.equal(expectedAttachment);
    });

    it('should read CSV 2', async () => {
      msg.body = { filename: 'result.csv' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'result.csv': {
          url: 'https://storage/objectId?storage_type=maester',
          size: 1316340,
          'content-type': 'text/csv',
        },
      };
      expect(result.attachments).to.deep.equal(expectedAttachment);
    });

    it('should read PNG', async () => {
      msg.body = { filename: 'b_jskob_ok.png' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'b_jskob_ok.png': {
          url: 'https://storage/objectId?storage_type=maester',
          size: 115194,
          'content-type': 'image/png',
        },
      };
      expect(result.attachments).to.deep.equal(expectedAttachment);
    });
  });
});
