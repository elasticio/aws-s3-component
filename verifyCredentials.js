const { Client } = require('./lib/client');

module.exports = function verifyCredentials(credentials, cb) {
  return Promise.resolve().then(async () => {
    this.logger.info('Verification started');
    const { accessKeyId, accessKeySecret: secretAccessKey, region } = credentials;
    if (!accessKeyId || !secretAccessKey || !region) {
      const errMessage = 'Parameters accessKeyId, secretAccessKey and region are required';
      this.logger.error(errMessage);
      throw new Error(errMessage);
    }
    this.logger.trace('Current credentials: %j', credentials);
    const client = new Client(this.logger, credentials);
    const bucketsNames = await client.listBucketNames();
    if (bucketsNames.length < 1) {
      this.logger.info('API keys are valid but they don\'t have permission to manipulate any existing buckets.');
    } else {
      this.logger.info(`The provided API keys have access to the following buckets: ${bucketsNames.join(', ')}`);
    }
    this.logger.info('Verification succeeded');
    cb(null, { verified: true });
    return { verified: true };
  }).catch((err) => {
    this.logger.error('Error occurred', err.stack || err);
    cb(err, { verified: false });
    return { verified: false };
  });
};
