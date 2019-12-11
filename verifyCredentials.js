const aws = require('aws-sdk');
const debug = require('debug')('Credentials');

module.exports = function verifyCredentials(credentials, cb) {
  return Promise.resolve().then(async () => {
    this.logger.info('Verification started');

    debug('Current credentials: %j', credentials);

    // eslint-disable-next-line no-new
    const s3 = new aws.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.accessKeySecret,
      region: credentials.region,
    });

    await s3.listObjects({ Bucket: '' }).promise();

    this.logger.info('Verification succeeded');
    cb(null, { verified: true });
    return { verified: true };
  }).catch((err) => {
    this.logger.error('Error occurred', err.stack || err);
    cb(err, { verified: false });
    return { verified: false };
  });
};
