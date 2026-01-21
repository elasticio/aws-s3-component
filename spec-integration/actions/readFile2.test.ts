/* eslint-disable func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import 'dotenv/config';
import getLogger from '@elastic.io/component-logger';
import * as readFile2 from '../../lib/actions/readFile2';
import { AttachmentProcessor } from '@elastic.io/component-commons-library';

process.env.ATTACHMENT_MAX_SIZE = '100000000';

const defaultCfg: any = {
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

describe('readFile2', () => {
  let cfg: typeof defaultCfg;
  let msg: any;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    msg = JSON.parse(JSON.stringify(defaultMsg));
  });

  test('should read XML', async () => {
    msg.body = { filename: 'test.xml' };
    const result = await readFile2.process.call(context, msg, cfg);
    
    assert.ok(result.body);
    assert.ok(result.body.declaration?.attributes || result.body.elements);
  });

  test('should read JSON', async () => {
    msg.body = { filename: 'test.json' };
    const result = await readFile2.process.call(context, msg, cfg);
    
    assert.ok(result.body);
    assert.ok(typeof result.body === 'object');
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

    test('should read CSV with attachment when pre-signed URLs disabled', async () => {
      cfg.usePreSignedUrls = false;
      msg.body = { filename: 'industry.csv' };
      const result = await readFile2.process.call(context, msg, cfg);
      const expectedAttachment = {
        'industry.csv': {
          url: 'http://api.io/some',
          size: 749,
          'content-type': 'text/csv',
        },
      };
      assert.deepStrictEqual(result.body.attachments, expectedAttachment);
      assert.strictEqual(result.body.attachmentUrl, 'http://api.io/some');
      assert.ok(!result.body.preSignedUrl);
    });

    test('should read jpg with attachment when pre-signed URLs disabled', async () => {
      cfg.usePreSignedUrls = false;
      msg.body = { filename: 'cat.jpg' };
      const result = await readFile2.process.call(context, msg, cfg);
      const expectedAttachment = {
        'cat.jpg': {
          url: 'http://api.io/some',
          size: 174335,
          'content-type': 'image/jpeg',
        },
      };
      assert.deepStrictEqual(result.body.attachments, expectedAttachment);
      assert.strictEqual(result.body.attachmentUrl, 'http://api.io/some');
      assert.ok(!result.body.preSignedUrl);
    });
  });

  describe('pre-signed URLs', () => {
    test('should generate pre-signed URL when enabled', async () => {
      cfg.usePreSignedUrls = true;
      cfg.preSignedUrlExpiration = 3600;
      msg.body = { filename: 'cat.jpg' };
      const result = await readFile2.process.call(context, msg, cfg);
      
      assert.ok(result.body.preSignedUrl);
      assert.ok(typeof result.body.preSignedUrl === 'string');
      assert.ok(result.body.preSignedUrl.includes('X-Amz-Signature') || result.body.preSignedUrl.includes('Signature'));
      assert.strictEqual(result.body.filename, 'cat.jpg');
      assert.strictEqual(result.body.size, 174335);
      assert.ok(!result.body.attachmentUrl);
      assert.ok(!result.body.attachments);
    });

    test('should generate pre-signed URL with custom expiration', async () => {
      cfg.usePreSignedUrls = true;
      cfg.preSignedUrlExpiration = 7200; // 2 hours
      msg.body = { filename: 'cat.jpg' };
      const result = await readFile2.process.call(context, msg, cfg);
      
      assert.ok(result.body.preSignedUrl);
      assert.ok(typeof result.body.preSignedUrl === 'string');
      assert.strictEqual(result.body.filename, 'cat.jpg');
    });

    test('should generate pre-signed URL for CSV file', async () => {
      cfg.usePreSignedUrls = true;
      msg.body = { filename: 'industry.csv' };
      const result = await readFile2.process.call(context, msg, cfg);
      
      assert.ok(result.body.preSignedUrl);
      assert.ok(typeof result.body.preSignedUrl === 'string');
      assert.strictEqual(result.body.filename, 'industry.csv');
      assert.strictEqual(result.body.size, 749);
    });

    test('should work with large files when pre-signed URLs enabled', async () => {
      cfg.usePreSignedUrls = true;
      msg.body = { filename: '150mb.jpg' }; // This file is larger than typical attachment limit
      const result = await readFile2.process.call(context, msg, cfg);
      
      // Should not throw error and should return pre-signed URL
      assert.ok(result.body.preSignedUrl);
      assert.ok(typeof result.body.preSignedUrl === 'string');
    });
  });
});

