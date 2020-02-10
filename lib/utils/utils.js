function createAWSInputs(bucketName) {
  // Check if a bucket name is correct according to https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html
  const lowerLetterOrNumberRegexp = /[a-z0-9]/g;
  const upperCaseRegexp = /[A-Z]/g;
  if (
    // Bucket names must be at least 3 ...
    bucketName.length < 3
    // ... and no more than 63 characters long
    || bucketName.length > 63
    // Bucket names must not contain underscores  ...
    || bucketName.indexOf('_') > -1
    // ... or uppercase characters
    || bucketName.match(upperCaseRegexp) !== null
    // Bucket names must start with a lowercase letter or number
    || bucketName.charAt(0).match(lowerLetterOrNumberRegexp) === null
  ) {
    throw new Error('Bucket name is not correct');
  }

  if (bucketName.indexOf('/') > -1) {
    const index = bucketName.indexOf('/');
    const folder = `${bucketName.substring(index + 1)}/`;
    const bucket = bucketName.substring(0, index);
    return { Bucket: bucket, Delimiter: '/', Prefix: folder };
  }
  return { Bucket: bucketName };
}
module.exports.createAWSInputs = createAWSInputs;
