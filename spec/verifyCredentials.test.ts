import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import verifyCredentials from '../verifyCredentials';
import { getContext } from './common';
import { AwsS3Client } from '../lib/AwsS3Client';

describe('verifyCredentials unit', () => {
  const cfg = {
    accessKeyId: 'id',
    accessKeySecret: 'secret',
    region: 'region',
  };

  test('should fail to validate an invalid access key ID', async () => {
    const context = getContext();
    const listBucketNamesMock = mock.method(AwsS3Client.prototype, 'listBucketNames', async () => {
      throw new Error('Invalid credentials');
    });

    const result = await verifyCredentials.call(context, cfg, (a) => a);
    assert.deepStrictEqual(result, { verified: false });
    assert.strictEqual(listBucketNamesMock.mock.calls.length, 1);
    
    listBucketNamesMock.mock.restore();
  });
});
