/* eslint-disable func-names */
const chai = require('chai');
const verifyCredentials = require('../../verifyCredentials');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
};

describe('verifyCredentials', () => {
  let cfg;

  beforeEach(() => { cfg = JSON.parse(JSON.stringify(defaultCfg)); });

  it('should validate valid credentials', async () => {
    const result = await verifyCredentials(cfg, a => a);
    expect(result).to.deep.equal({ verified: true });
  });

  it('should fail to validate an invalid access key ID', async () => {
    cfg.accessKeyId = 'wrong';

    const result = await verifyCredentials(cfg, a => a);
    expect(result).to.deep.equal({ verified: false });
  });
});
