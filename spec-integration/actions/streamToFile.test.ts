/* eslint-disable func-names */
import 'dotenv/config';
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import * as streamToFile from '../../lib/actions/streamToFile';
import getLogger from '@elastic.io/component-logger';

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 's3-component-test-1',
};

const defaultMsg = {
  body: {
    filename: 'test-new.txt',
  },
  attachments: {
    'test-new.txt': {
      url: 'https://attachment.url.loc/test.txt',
    },
  },
};

const context = {
  emit: mock.fn(),
  logger: getLogger(),
};

describe('streamToFile', () => {
  let cfg: typeof defaultCfg;
  let msg: typeof defaultMsg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test('should update', async () => {
    nock('https://attachment.url.loc/', { encodedQueryParams: true })
      .get('/test.txt').reply(200, 'Hello World!!!');
    const result = await streamToFile.process.call(context, msg, cfg);
    assert.strictEqual(result.body.Key, 'test-new.txt');
  });
});
