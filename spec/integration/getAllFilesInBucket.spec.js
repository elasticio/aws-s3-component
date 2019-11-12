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

  it('should get files', async () => {
    await getAllFilesInBucket.process.call(self, msg, cfg);
    const result = self.emit.getCalls();
    expect(result.length).to.equal(103);
  });
});
