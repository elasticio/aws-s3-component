/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const readFile = require('../../lib/actions/readFile');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev/test',
};

const defaultMsg = {};

const self = {
  emit: sinon.spy(),
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
    beforeEach(() => {
      nock('http://api-service.platform.svc.cluster.local.:9000/', { encodedQueryParams: true })
        .post('/v2/resources/storage/signed-url')
        .reply(200, { put_url: 'http://api.io/some', get_url: 'http://api.io/some' });
      nock('http://api.io/', { encodedQueryParams: true })
        .put('/some').reply(200, { signedUrl: { put_url: 'http://api.io/some' } });
    });

    it('should read CSV 1', async () => {
      msg.body = { filename: 'Depotumsätze.csv' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'Depotumsätze.csv': {
          url: 'http://api.io/some',
          size: 13911,
          'content-type': 'text/csv',
        },
      };
      expect(result.body.attachments).to.deep.equal(expectedAttachment);
    });

    it('should read CSV 2', async () => {
      msg.body = { filename: 'result.csv' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'result.csv': {
          url: 'http://api.io/some',
          size: 1316340,
          'content-type': 'text/csv',
        },
      };
      expect(result.body.attachments).to.deep.equal(expectedAttachment);
    });

    it('should read PNG', async () => {
      msg.body = { filename: 'b_jskob_ok.png' };
      const result = await readFile.process.call(self, msg, cfg, {});
      const expectedAttachment = {
        'b_jskob_ok.png': {
          url: 'http://api.io/some',
          size: 115194,
          'content-type': 'image/png',
        },
      };
      expect(result.body.attachments).to.deep.equal(expectedAttachment);
    });
  });
});
