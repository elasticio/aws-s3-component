import { test, describe, mock } from 'node:test';
import assert from 'node:assert';
import 'dotenv/config';
import * as listObjects from '../../lib/actions/listObjects';
import getLogger from '@elastic.io/component-logger';

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 's3-component-test-1',
};

const defaultMsg = {
  body: {
    keyRegex: '.*',
  },
};

const self = {
  emit: mock.fn(),
  logger: getLogger(),
};

describe('listObjects', () => {
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

  test('Should get testfile from bucket according to pattern', async () => {
    msg.body.keyRegex = 'cat\\.jpg';
    await listObjects.process.call(self, msg, cfg);
    
    const emits = (self.emit as any).mock.calls;
    assert.ok(emits.length > 1, 'Should emit at least data and end');
    
    const dataEmits = emits.filter((c: any) => c.arguments[0] === 'data');
    assert.ok(dataEmits.length > 0, 'Should emit data at least once');

    // The result should include SignedUrl and Key matching our Regex
    const firstMatch = dataEmits[0].arguments[1].body;
    assert.ok(firstMatch.Key.includes('cat.jpg'), `Expected Key to include "cat.jpg", got ${firstMatch.Key}`);
    assert.ok(firstMatch.SignedUrl, 'Expected SignedUrl to be populated');
  });

  test('Should fetch multiple files with catch-all pattern', async () => {
    msg.body.keyRegex = '.*';
    await listObjects.process.call(self, msg, cfg);

    const emits = (self.emit as any).mock.calls;
    const dataEmits = emits.filter((c: any) => c.arguments[0] === 'data');
    
    assert.ok(dataEmits.length > 3, "Should fetch multiple objects with .* pattern");
  });

  test('should fail if no search pattern is set', async () => {
    msg.body.keyRegex = '';
    await assert.rejects(
      async () => await listObjects.process.call(self, msg, cfg),
      {
        message: 'No search pattern set to filter',
      }
    );
  });
});
