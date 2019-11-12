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
  bucketName: 'lloyds-dev/csv',
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

  it('should read CSV 1', async () => {
    msg.body = { filename: 'Depotumsätze.csv' };
    await readFile.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];

    expect(result.body.name).to.equal('amazon-s3-component');
  });

  it('should read CSV 2', async () => {
    nock('http://api-service.platform.svc.cluster.local.:9000/', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200, { put_url: 'http://api.io/some', get_url: 'http://api.io/some' });
    nock('http://api.io/', { encodedQueryParams: true })
      .put('/some').reply(200, { signedUrl: { put_url: 'http://api.io/some' } });

    msg.body = { filename: 'csv/result.csv' };

    await readFile.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];

    const expectedAttachment = {
      'csv/result.csv': {
        url: 'http://api.io/some',
        size: 22,
        'content-type': 'text/csv',
      },
    };

    expect(result.body.attachments).to.deep.equal(expectedAttachment);
  });

  it('should read PNG', async () => {
    nock('http://api-service.platform.svc.cluster.local.:9000/', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200, { put_url: 'http://api.io/some', get_url: 'http://api.io/some' });
    nock('http://api.io/', { encodedQueryParams: true })
      .put('/some').reply(200, { signedUrl: { put_url: 'http://api.io/some' } });

    msg.body = { filename: 'b_jskob_ok.png' };

    await readFile.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];

    const expectedAttachment = {
      'b_jskob_ok.png': {
        url: 'http://api.io/some',
        size: 109170,
        'content-type': 'image/png',
      },
    };

    expect(result.body.attachments).to.deep.equal(expectedAttachment);
  });
});
