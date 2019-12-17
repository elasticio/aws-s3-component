/* eslint-disable func-names */
require('dotenv').config();
const chai = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const bunyan = require('bunyan');

const streamToFile = require('../lib/actions/streamToFile');

const { expect } = chai;

const logger = bunyan.createLogger({ name: 'streamToFile', level: 'trace' });

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev/Demo',
};

const defaultMsg = {
  body: {
    filename: 'some123isin',
  },
  attachments: {
    someKey: {
      url: 'https://attachment.url.loc/someof',
    },
  },
};

const self = {
  emit: sinon.spy(),
  logger,
};

describe('streamToFile', () => {
  let cfg;
  let msg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  afterEach(() => self.emit.resetHistory());

  it('should update', async () => {
    nock('https://attachment.url.loc/', { encodedQueryParams: true })
      .get('/someof').reply(200, [{ hello: 'world' }, { andSomething: 'too' }]);

    await streamToFile.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];
    expect(Object.keys(result.body)[0]).to.equal('ETag');
  });
});
