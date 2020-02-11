/* eslint-disable func-names */
const chai = require('chai');
const sinon = require('sinon');

const logger = require('@elastic.io/component-logger')();
const getAllFilesInBucket = require('../../lib/triggers/pollingTrigger');
require('dotenv').config();

const { expect } = chai;

const defaultCfg = {
  accessKeyId: process.env.ACCESS_KEY_ID,
  accessKeySecret: process.env.ACCESS_KEY_SECRET,
  region: process.env.REGION,
  bucketName: 'lloyds-dev/inbound',
};

const self = {
  emit: sinon.spy(),
  logger,
};

describe('pollingTrigger', () => {
  let cfg;

  beforeEach(() => {
    cfg = JSON.parse(JSON.stringify(defaultCfg));
  });

  afterEach(() => self.emit.resetHistory());

  it('emit individually', async () => {
    cfg.emitBehaviour = 'emitIndividually';

    await getAllFilesInBucket.process.call(self, {}, cfg, {});

    const emittedData = self.emit.getCalls()
      .filter(call => call.args[0] === 'data')
      .map(call => call.args[1]);

    expect(emittedData.map(file => file.body.Key)).to.include('inbound/test.xml');

    const emittedSnapshots = self.emit.getCalls()
      .filter(call => call.args[0] === 'snapshot')
      .map(call => call.args[1]);

    expect(emittedSnapshots.length).to.be.equals(1);
    expect(emittedSnapshots[0]).to.contain.keys('startTime');
  });

  it('fetch all', async () => {
    cfg.emitBehaviour = 'fetchAll';

    await getAllFilesInBucket.process.call(self, {}, cfg, {});

    const emittedData = self.emit.getCalls()
      .filter(call => call.args[0] === 'data')
      .map(call => call.args[1]);

    expect(emittedData.length).to.be.equals(1);
    expect(emittedData[0].body.results.map(file => file.Key)).to.include('inbound/test.xml');

    const emittedSnapshots = self.emit.getCalls()
      .filter(call => call.args[0] === 'snapshot')
      .map(call => call.args[1]);

    expect(emittedSnapshots.length).to.be.equals(1);
    expect(emittedSnapshots[0]).to.contain.keys('startTime');
  });
});
