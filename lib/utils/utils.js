function createAWSInputs(bucketName) {
  if (bucketName.indexOf('/') > -1) {
    const index = bucketName.indexOf('/');
    const folder = `${bucketName.substring(index + 1)}/`;
    const bucket = bucketName.substring(0, index);
    return { Bucket: bucket, Delimiter: '/', Prefix: folder };
  }
  return { Bucket: bucketName };
}
module.exports.createAWSInputs = createAWSInputs;
