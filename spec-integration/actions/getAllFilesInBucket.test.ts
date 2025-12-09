/* eslint-disable func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import 'dotenv/config';
import * as getAllFilesInBucket from '../../lib/actions/getAllFilesInBucket';
import getLogger from '@elastic.io/component-logger';

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 's3-component-test-1',
};

const defaultMsg = {
  body: {
    filename: 'cat.jpg',
  },
};

const self = {
  emit: mock.fn(),
  logger: getLogger(),
};

describe('getAllFilesInBucket', () => {
  let cfg: typeof defaultCfg;
  let msg: typeof defaultMsg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test.afterEach(() => {
    (self.emit as any).mock.resetCalls();
    mock.restoreAll();
  });

  test('Should get testfile from bucket', async () => {
    const result = await getAllFilesInBucket.process.call(self, msg, cfg);
    const files = result.body.filenames;
    assert.ok(Array.isArray(files));
    assert.ok(files.length > 0);
    // Check if the filename is in the array (either exact match or as part of a path)
    const found = files.some((file: string) => file === msg.body.filename || file.endsWith(`/${msg.body.filename}`));
    assert.ok(found, `Expected to find ${msg.body.filename} in files: ${files.slice(0, 10).join(', ')}...`);
  });

  test('Should fetch more than 3 files from bucket', async () => {
    const result = await getAllFilesInBucket.process.call(self, msg, cfg);
    const files = result.body.filenames;
    assert.ok(Array.isArray(files));
    assert.ok(files.length > 3);
  });

  test('should emit empty message if no files was found in bucket', async () => {
    cfg.bucketName = 's3-component-test-1/notExistFolder';
    const result = await getAllFilesInBucket.process.call(self, msg, cfg);
    assert.deepStrictEqual(result.body, {});
  });

  test('should emit empty message empty folder name with "/"', async () => {
    cfg.bucketName = 's3-component-test-1/';
    const result = await getAllFilesInBucket.process.call(self, msg, cfg);
    assert.deepStrictEqual(result.body, {});
  });

  test('should fail for empty bucket name', async () => {
    cfg.bucketName = '';
    await assert.rejects(
      async () => await getAllFilesInBucket.process.call(self, msg, cfg),
      {
        message: 'Bucket name cannot be empty. Provided bucket name: ',
      }
    );
  });

  test('should fail for undefined bucket name', async () => {
    cfg.bucketName = undefined as any;
    await assert.rejects(
      async () => await getAllFilesInBucket.process.call(self, msg, cfg),
      {
        message: 'Bucket name cannot be empty. Provided bucket name: undefined',
      }
    );
  });

  test('should fail for null bucket name', async () => {
    cfg.bucketName = null as any;
    await assert.rejects(
      async () => await getAllFilesInBucket.process.call(self, msg, cfg),
      {
        message: 'Bucket name cannot be empty. Provided bucket name: null',
      }
    );
  });

  test('should fail if bucket not exist', async () => {
    cfg.bucketName = 'notExistBucket/test';
    await assert.rejects(
      async () => await getAllFilesInBucket.process.call(self, msg, cfg),
      {
        message: 'Error checking if bucket notExistBucket/test exists: Error: Bucket notExistBucket/test does not exist',
      }
    );
  });
});
