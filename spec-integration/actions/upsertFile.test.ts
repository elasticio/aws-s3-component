/* eslint-disable func-names */
import 'dotenv/config';
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import getLogger from '@elastic.io/component-logger';
import * as upsertFile from '../../lib/actions/upsertFile';

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
};

const defaultMsg = {
  id: 'test-message-id',
  body: {
    bucketName: 's3-component-test-1',
    fileName: 'test-new.txt',
    attachmentUrl: 'https://attachment.url.loc/test.txt',
  },
};

const context = {
  emit: mock.fn(),
  logger: getLogger(),
};

describe('upsertFile', () => {
  let cfg: typeof defaultCfg;
  let msg: typeof defaultMsg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test('should update', async () => {
    nock('https://attachment.url.loc/', { encodedQueryParams: true })
      .get('/test.txt').reply(200, 'Hello World!!!');

    const result = await upsertFile.process.call(context, msg, cfg);
    assert.strictEqual(result.body.Key, 'test-new.txt');
  });

  test('should generate metadata', async () => {
    const metadata = await upsertFile.getMetaModel.call(context, cfg);
    assert.ok(metadata.in.properties.bucketName.enum.includes(defaultMsg.body.bucketName));
    assert.strictEqual(metadata.in.properties.fileName.type, 'string');
    assert.strictEqual(metadata.in.properties.attachmentUrl.type, 'string');
  });
});
