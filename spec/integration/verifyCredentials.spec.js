require('dotenv').config();
const chai = require('chai');
const bunyan = require('bunyan');
const verifyCredentials = require('../../verifyCredentials');

const { expect } = chai;
const logger = bunyan.createLogger({ name: 'verifyCredentials' });
const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
};

describe('verifyCredentials', () => {
  let cfg;

  beforeEach(() => { cfg = JSON.parse(JSON.stringify(defaultCfg)); });

  it('should validate valid credentials', async () => {
    const result = await verifyCredentials.call({ logger }, cfg, (a) => a);
    expect(result).to.deep.equal({ verified: true });
  });

  it('should fail to validate an invalid access key ID', async () => {
    cfg.accessKeyId = 'invalid';

    const result = await verifyCredentials.call({ logger }, cfg, (a) => a);
    expect(result).to.deep.equal({ verified: false });
  });
});
