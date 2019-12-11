/* eslint-disable global-require,func-names */
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');

const { expect } = chai;
const bunyan = require('bunyan');

const logger = bunyan.createLogger({ name: 'verifyCredentials' });

const renameFile = require('../lib/actions/renameObject');

describe('Rename file', function () {
  this.timeout(50000);
  let configuration;
  let emitter;
  let msg;

  before(async () => {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }

    configuration = {
      accessKeyId: process.env.ACCESS_KEY_ID,
      accessKeySecret: process.env.ACCESS_KEY_SECRET,
      region: process.env.REGION,
    };
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger,
    };

    msg = {
      body: {
        bucketName: 'lloyds-dev',
        prefix: 'sprint-review/in/',
        oldFileName: 'test.txt',
        newFileName: 'testRename1.txt',
      },
    };
  });

  it('Rename file', async () => {
    await renameFile.process.call(emitter, msg, configuration, {});
    const result = emitter.emit.getCall(0).args[1];
    expect(result.body.Key).to.eql(`${msg.body.prefix || ''}${msg.body.newFileName}`);
  });
});
