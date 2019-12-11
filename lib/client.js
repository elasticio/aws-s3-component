const aws = require('aws-sdk');

class Client {
  constructor(logger, credentials) {
    this.logger = logger;
    const { accessKeyId, accessKeySecret: secretAccessKey, region } = credentials;
    this.s3 = new aws.S3({ accessKeyId, secretAccessKey, region });
  }

  async getFileFromBucket(bucketName, filename) {
    this.logger.info(`Finding file ${filename} in bucket: ${bucketName}`);
    const data = await this.s3.listObjects({ Bucket: bucketName, Delimiter: '/', Prefix: filename }).promise();
    this.logger.trace(`Found data: ${JSON.stringify(data)}`);
    const foundFiles = data.Contents.filter((item) => item.Key === filename);
    this.logger.trace(`Found file: ${JSON.stringify(foundFiles)}`);
    if (foundFiles.length !== 1) {
      return null;
    }
    return foundFiles[0];
  }

  async copyObject(copySource, bucketName, key) {
    const params = {
      CopySource: copySource,
      Bucket: bucketName,
      Key: key,
    };
    await this.s3.copyObject(params).promise();
  }

  async deleteObject(bucketName, fileName) {
    await this.s3.deleteObject({ Bucket: bucketName, Key: fileName }).promise();
  }
}
module.exports.Client = Client;
