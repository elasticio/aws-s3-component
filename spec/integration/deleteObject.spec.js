/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');
const deleteObject = require('../../lib/actions/deleteObject');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  bucketName: 'lloyds-dev',
};

const defaultMsg = {
  body: {
    filename: 'AT0000856323',
  },
};

const self = {
  emit: sinon.spy(),
};

describe('deleteObject', () => {
  let cfg;
  let msg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  afterEach(() => self.emit.resetHistory());

  it('should delete', async () => {
    await deleteObject.process.call(self, msg, cfg, {});
    const result = self.emit.getCall(0).args[1];
    expect(result.body.filename).to.equal(msg.body.filename);
  });
});
