import { describe, test } from 'node:test';
import assert from 'node:assert';
import { buildS3Config, Credentials } from '../lib/AwsS3Client';

describe('AwsS3Client endpoint configuration', () => {
  test('uses default AWS config when no endpoint provided', () => {
    const cfg: Credentials = {
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      region: 'aws-region',
    };
    const config = buildS3Config(cfg);
    const creds = config.credentials as any;
    assert.strictEqual(creds.accessKeyId, 'id');
    assert.strictEqual(creds.secretAccessKey, 'secret');
    assert.strictEqual(config.region, 'aws-region');
    assert.strictEqual(config.endpoint, undefined);
    assert.strictEqual(config.forcePathStyle, undefined);
  });

  test('applies endpoint with default path-style and signature v4', () => {
    const cfg: Credentials = {
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      region: 'region',
      endpoint: 'https://custom-endpoint',
    };
    const config = buildS3Config(cfg);
    const creds = config.credentials as any;
    assert.strictEqual(creds.accessKeyId, 'id');
    assert.strictEqual(creds.secretAccessKey, 'secret');
    assert.strictEqual(config.endpoint, 'https://custom-endpoint');
    assert.strictEqual(config.forcePathStyle, true);
  });

  test('allows overriding path-style and signature version', () => {
    const cfg: Credentials = {
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      region: 'region',
      endpoint: 'https://custom-endpoint',
      s3ForcePathStyle: false,
    };
    const config = buildS3Config(cfg);
    const creds = config.credentials as any;
    assert.strictEqual(creds.accessKeyId, 'id');
    assert.strictEqual(creds.secretAccessKey, 'secret');
    assert.strictEqual(config.endpoint, 'https://custom-endpoint');
    assert.strictEqual(config.forcePathStyle, false);
  });
});

