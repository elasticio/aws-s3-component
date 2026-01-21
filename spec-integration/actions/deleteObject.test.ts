/* eslint-disable func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import getLogger from '@elastic.io/component-logger';
import { AwsS3Client } from '../../lib/AwsS3Client';
import * as deleteObject from '../../lib/actions/deleteObject';
import 'dotenv/config';

const logger = getLogger();

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
  logger,
};

describe('deleteObject', () => {
  let cfg: typeof defaultCfg;
  let msg: typeof defaultMsg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test('delete file', async () => {
    const client = new AwsS3Client({ logger }, cfg);
    await client.upload(cfg.bucketName, msg.body.filename, 'some text file content');

    const result = await deleteObject.process.call(self, msg, cfg, {});
    assert.deepStrictEqual(result.body, { filename: msg.body.filename });
  });

  test('process file already not exists case', async () => {
    const result = await deleteObject.process.call(self, msg, cfg, {});
    assert.deepStrictEqual(result.body, {});
  });
});
