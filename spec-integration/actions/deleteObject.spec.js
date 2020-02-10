/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const logger = require('@elastic.io/component-logger')();

const { Client } = require('../../lib/client');
const deleteObject = require('../../lib/actions/deleteObject');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev',
};

const defaultMsg = {
  body: {
    filename: 'AT0000856323',
  },
};

const self = {
  emit: sinon.spy(),
  logger,
};

describe('deleteObject', () => {
  let cfg;
  let msg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  afterEach(() => self.emit.resetHistory());

  it('delete file', async () => {
    const client = new Client(logger, cfg);
    await client.upload(cfg.bucketName, msg.body.filename, 'some text file content');

    const result = await deleteObject.process.call(self, msg, cfg, {});
    const emitterCalls = self.emit.getCalls();
    expect(result.body).to.deep.equal({ filename: msg.body.filename });
    expect(emitterCalls.length).to.equal(0);
  });

  it('process file already not exists case', async () => {
    const result = await deleteObject.process.call(self, msg, cfg, {});
    const emitterCalls = self.emit.getCalls();
    expect(result.body).to.deep.equal({});
    expect(emitterCalls.length).to.equal(0);
  });
});
