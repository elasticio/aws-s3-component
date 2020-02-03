const { Client } = require('../client');
const { AwsS3Polling } = require('../utils/pollingUtil');

exports.process = async function (msg, cfg, snapshot) {
  const client = new Client(this.logger, cfg);

  const pollingTrigger = new AwsS3Polling(this.logger, this, client, cfg);
  await pollingTrigger.process(cfg, snapshot);
};
