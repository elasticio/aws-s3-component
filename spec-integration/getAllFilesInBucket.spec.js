/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const getAllFilesInBucket = require('../lib/actions/getAllFilesInBucket');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev/test-dir-dont-delete',
};

const defaultMsg = {
  body: {
    filename: 'testfile',
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

  it('Should get testfile from bucket', async () => {
    await getAllFilesInBucket.process.call(self, msg, cfg);
    const files = self.emit.getCalls().map((call) => (call.args[1] ? call.args[1].body.filename : 'end emit'));
    expect(files).to.include('test-dir-dont-delete/testfile');
  });

  it('Should fetch more than 1000 files from bucket', async () => {
    await getAllFilesInBucket.process.call(self, msg, cfg);
    const files = self.emit.getCalls().map((call) => (call.args[1] ? call.args[1].body.filename : 'end emit'));
    expect(files.length).to.be.above(1002);
  });
});
