const chai = require('chai');
const bunyan = require('bunyan');
const verifyCredentials = require('../verifyCredentials');

const { expect } = chai;
const logger = bunyan.createLogger({ name: 'verifyCredentials' });

describe('verifyCredentials unit', () => {
  const cfg = {
    accessKeyId: 'id',
    accessKeySecret: 'secret',
    region: 'region',
  };

  it('should fail to validate an invalid access key ID', async () => {
    const result = await verifyCredentials.call({ logger }, cfg, (a) => a);
    expect(result).to.deep.equal({ verified: false });
  });
});
