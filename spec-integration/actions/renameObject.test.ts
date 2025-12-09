/* eslint-disable global-require,func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import 'dotenv/config';
import getLogger from '@elastic.io/component-logger';
import { AwsS3Client } from '../../lib/AwsS3Client';
import * as renameFile from '../../lib/actions/renameObject';

let client: AwsS3Client;
let src: fs.ReadStream;

describe('Rename file', () => {
  const defaultCfg = {
    accessKeyId: process.env.ACCESS_KEY_ID,
    accessKeySecret: process.env.ACCESS_KEY_SECRET,
    region: process.env.REGION,
    bucketName: 's3-component-test-1',
  };
  
  const bucketName = 's3-component-test-1';
  const oldFileName = 'test.txt';
  const newFileName = 'test-new.txt';
  const folder = 'folder-1/';

  const context = {
    emit: mock.fn(),
    logger: getLogger(),
  };

  test.before(async () => {
    src = fs.createReadStream('./spec-integration/actions/test.txt');
    client = new AwsS3Client(context, defaultCfg);
  });

  test('Rename file', async () => {
    const msg = {
      body: {
        bucketName,
        folder,
        oldFileName,
        newFileName,
      },
    };
    const oldKeyName = `${msg.body.folder || ''}${msg.body.oldFileName}`;
    const newKeyName = `${msg.body.folder || ''}${msg.body.newFileName}`;
    await client.deleteObject(bucketName, oldKeyName);
    await client.deleteObject(bucketName, newKeyName);
    await client.upload(bucketName, oldKeyName, src);
    const result = await renameFile.process.call(context, msg, defaultCfg);
    assert.strictEqual(result.body.Key, `${msg.body.folder || ''}${msg.body.newFileName}`);
  });
});
