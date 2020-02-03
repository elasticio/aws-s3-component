/* eslint-disable global-require,func-names */
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');

const { expect } = chai;
const bunyan = require('bunyan');

const logger = bunyan.createLogger({ name: 'RenameFile', level: 'info' });
const { Client } = require('../../lib/client');
const renameFile = require('../../lib/actions/renameObject');

describe('Rename file', function () {
  this.timeout(50000);
  let configuration;
  let emitter;
  let msg;
  let src;
  let client;
  const bucketName = 'lloyds-dev';
  const oldFileName = 'oldFileName.txt';
  const newFileName = 'newFileName.txt';
  const folder = 'sprint-review/in/';

  before(async () => {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }
    src = fs.createReadStream('./spec-integration/actions/test.txt');
    configuration = {
      accessKeyId: process.env.ACCESS_KEY_ID,
      accessKeySecret: process.env.ACCESS_KEY_SECRET,
      region: process.env.REGION,
    };
    client = new Client(logger, configuration);
  });

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
      logger,
    };
  });

  it('Rename file', async () => {
    msg = {
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
    await renameFile.process.call(emitter, msg, configuration, {});
    const result = emitter.emit.getCall(0).args[1];
    expect(result.body.Key).to.eql(`${msg.body.folder || ''}${msg.body.newFileName}`);
  });
});
