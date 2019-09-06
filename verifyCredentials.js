const aws = require('aws-sdk');
const debug = require('debug')('Credentials');

/**
 * This function will be called by the platform to verify credentials
 *
 * @param credentials - input credentials
 * @callback cb  - callback function
 */
module.exports = function verifyCredentials(credentials, cb) {
  return Promise.resolve().then(async () => {
    console.log('Verification started');

    debug('Current credentials: %j', credentials);

    const s3 = new aws.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.accessKeySecret,
      region: 'us-east-1'
    });

    // eslint-disable-next-line no-use-before-define
    //const data = await s3.listObjects({ Bucket: '' }).promise();
    //debug('Root dir files: %j', data.Contents.forEach(c => c.Key));
    console.log('Verification completed');

    cb(null, { verified: true });
    return { verified: true };
  }).catch((err) => {
    console.error('Error occurred', err.stack || err);
    cb(err, { verified: false });
    return { verified: false };
  });
};
