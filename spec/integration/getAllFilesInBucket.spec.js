/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const getAllFilesInBucket = require('../../lib/actions/getAllFilesInBucket');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  bucketName: 'lloyds-dev/inbound',
};

const defaultMsg = {
  body: {
    filename: 'some123isin',
  },
};

const self = {
  emit: sinon.spy(),
};

describe('getAllFilesInBucket', () => {
  let cfg;
  let msg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  afterEach(() => self.emit.resetHistory());

  it('should get test.xml from bucket', async () => {
    await getAllFilesInBucket.process.call(self, msg, cfg);
    const files = self.emit.getCalls().map(call => (call.args[1] ? call.args[1].body.filename : 'end emit'));
    expect(files).to.include('inbound/test.xml');
  });
});
