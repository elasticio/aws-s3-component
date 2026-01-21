/* eslint-disable func-names */
import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import getLogger from '@elastic.io/component-logger';
import * as pollingTrigger from '../../lib/triggers/pollingTrigger';
import 'dotenv/config';

const defaultCfg: any = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 's3-component-test-1/folder-1',
  emitBehaviour: 'emitIndividually',
};

const context = {
  emit: mock.fn(),
  logger: getLogger(),
};

describe('pollingTrigger', () => {
  let cfg: typeof defaultCfg;

  test.beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
    (context.emit as any).mock.resetCalls();
  });

  test('emit individually', async () => {
    cfg.emitBehaviour = 'emitIndividually';

    await pollingTrigger.process.call(context, {}, cfg);

    const emittedData = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'data')
      .map((call: any) => call.arguments[1])
      .filter((msg: any) => msg && msg.body);

    assert.ok(emittedData.length > 0);

    assert.ok(emittedData.some((msg: any) => msg.body.Key && msg.body.Key.endsWith('cat.jpg')));

    const emittedSnapshots = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'snapshot')
      .map((call: any) => call.arguments[1])
      .filter((snapshot: any) => snapshot);

    assert.strictEqual(emittedSnapshots.length, 1);
    assert.ok('startTime' in emittedSnapshots[0]);
  });

  test('emit individually with pre-signed URLs', async () => {
    cfg.emitBehaviour = 'emitIndividually';
    cfg.enableFileAttachments = false;
    cfg.usePreSignedUrls = true;
    cfg.preSignedUrlExpiration = 3600;

    await pollingTrigger.process.call(context, {}, cfg);

    const emittedData = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'data')
      .map((call: any) => call.arguments[1])
      .filter((msg: any) => msg && msg.body);

    assert.ok(emittedData.length > 0);
    
    const fileMessage = emittedData.find((msg: any) => {
      const key = msg.body.Key || '';
      return key === 'test.xml';
    });
    assert.ok(fileMessage, `Should find test.xml in emitted messages. Found keys: ${emittedData.map((m: any) => m.body.Key).join(', ')}`);
    
    // Check that pre-signed URL is present
    assert.ok(fileMessage.body.preSignedUrl, `Should have preSignedUrl. Message body: ${JSON.stringify(fileMessage.body)}`);
    assert.ok(typeof fileMessage.body.preSignedUrl === 'string');
    assert.ok(fileMessage.body.preSignedUrl.includes('X-Amz-Signature') || fileMessage.body.preSignedUrl.includes('Signature') || fileMessage.body.preSignedUrl.includes('AWSAccessKeyId'));
    
    // Check that attachmentUrl is not present
    assert.ok(!fileMessage.body.attachmentUrl, 'Should not have attachmentUrl when using pre-signed URLs');
  });

  test('emit individually with attachments (no pre-signed URLs)', async () => {
    cfg.emitBehaviour = 'emitIndividually';
    cfg.enableFileAttachments = true;
    cfg.usePreSignedUrls = false;
    
    const snapshot = {
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    };

    await pollingTrigger.process.call(context, {}, cfg, snapshot);

    const emittedData = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'data')
      .map((call: any) => call.arguments[1])
      .filter((msg: any) => msg && msg.body);

    assert.ok(emittedData.length > 0);
    
    // Filter out large files that would exceed attachment size limit
    const fileMessage = emittedData.find((msg: any) => {
      const key = msg.body.Key;
      const size = msg.body.Size || 0;
      return (key === 'cat.jpg' || key === 'industry.csv' || key === 'test.xml') && size < 100000000;
    });
    assert.ok(fileMessage, 'Should find a small file in emitted messages');
    
    // Check that attachmentUrl is present
    assert.ok(fileMessage.body.attachmentUrl, 'Should have attachmentUrl');
    assert.ok(typeof fileMessage.body.attachmentUrl === 'string');
    
    // Check that preSignedUrl is not present
    assert.ok(!fileMessage.body.preSignedUrl, 'Should not have preSignedUrl when using attachments');
  });

  test('fetch all', async () => {
    cfg.emitBehaviour = 'fetchAll';

    await pollingTrigger.process.call(context, {}, cfg);

    const emittedData = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'data')
      .map((call: any) => call.arguments[1])
      .filter((msg: any) => msg && msg.body);

    assert.strictEqual(emittedData.length, 1);
    assert.ok(emittedData[0].body.results && emittedData[0].body.results.some((file: any) => 
      file.Key && file.Key.endsWith('cat.jpg')));

    const emittedSnapshots = (context.emit as any).mock.calls
      .filter((call: any) => call.arguments && call.arguments[0] === 'snapshot')
      .map((call: any) => call.arguments[1])
      .filter((snapshot: any) => snapshot);

    assert.strictEqual(emittedSnapshots.length, 1);
    assert.ok('startTime' in emittedSnapshots[0]);
  });
});
