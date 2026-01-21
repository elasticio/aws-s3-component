import 'dotenv/config';
import { test, describe } from 'node:test';
import assert from 'node:assert';
import verifyCredentials from '../../verifyCredentials';
import getLogger from '@elastic.io/component-logger';

const logger = getLogger();

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
};

describe('verifyCredentials', () => {
  let cfg: typeof defaultCfg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
  });

  test('should validate valid credentials', async () => {
    const result = await verifyCredentials.call({ logger }, cfg, (a: any) => a);
    assert.deepStrictEqual(result, { verified: true });
  });

  test('should fail to validate an invalid access key ID', async () => {
    cfg.accessKeyId = 'invalid';

    const result = await verifyCredentials.call({ logger }, cfg, (a: any) => a);
    assert.deepStrictEqual(result, { verified: false });
  });

  test('should fail required params are missing', async () => {
    await assert.rejects(
      async () => await verifyCredentials.call({ logger }, { accessKeyId: 'accessKeyId' }, (a: any) => a),
      {
        message: 'Parameters accessKeyId, secretAccessKey and region are required',
      }
    );
  });
});
