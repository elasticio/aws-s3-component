/* eslint-disable func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import 'dotenv/config';
import getLogger from '@elastic.io/component-logger';
import * as readFile from '../../lib/actions/readFile';
import { AttachmentProcessor } from '@elastic.io/component-commons-library';

process.env.ATTACHMENT_MAX_SIZE = '100000000';

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 's3-component-test-1',
};

const defaultMsg = {};

const logger = getLogger();

const context = {
  emit: mock.fn(),
  logger,
};

describe('readFile', () => {
  let cfg: typeof defaultCfg;
  let msg: any;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test('should read XML', async () => {
    msg.body = { filename: 'test.xml' };
    const result = await readFile.process.call(context, msg, cfg);
    
    assert.ok(result.body);
    assert.ok(result.body.declaration.attributes);
    assert.strictEqual(result.body.declaration.attributes.version, '1.0');
    assert.ok(result.body.Tests || result.body.elements);
  });

  describe('reads file types other than XML or JSON by using attachmentProcessor', () => {
    let uploadAttachmentStub: any;
    let getMaesterAttachmentUrlByIdStub: any;

    test.before(() => {
      uploadAttachmentStub = mock.method(
        AttachmentProcessor.prototype,
        'uploadAttachment',
        async () => 'attachment-id-123'
      );
      getMaesterAttachmentUrlByIdStub = mock.method(
        AttachmentProcessor.prototype,
        'getMaesterAttachmentUrlById',
        () => 'http://api.io/some'
      );
    });

    test.after(() => {
      uploadAttachmentStub.mock.restore();
      getMaesterAttachmentUrlByIdStub.mock.restore();
    });

    test('should read CSV', async () => {
      msg.body = { filename: 'industry.csv' };
      const result = await readFile.process.call(context, msg, cfg);
      const expectedAttachment = {
        'industry.csv': {
          url: 'http://api.io/some',
          size: 749,
          'content-type': 'text/csv',
        },
      };
      assert.deepStrictEqual(result.body.attachments, expectedAttachment);
    });

    test('should read jpg', async () => {
      msg.body = { filename: 'cat.jpg' };
      const result = await readFile.process.call(context, msg, cfg);
      const expectedAttachment = {
        'cat.jpg': {
          url: 'http://api.io/some',
          size: 174335,
          'content-type': 'image/jpeg',
        },
      };
      assert.deepStrictEqual(result.body.attachments, expectedAttachment);
    });
  });
});
