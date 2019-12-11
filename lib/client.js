const aws = require('aws-sdk');

function createAWSParams(bucketName, prefix) {
  const params = {
    Bucket: bucketName,
  };
  if (prefix) {
    params.Delimiter = '/';
    params.Prefix = prefix;
  }
  return params;
}

class Client {
  constructor(logger, credentials) {
    this.logger = logger;
    const { accessKeyId, accessKeySecret: secretAccessKey, region } = credentials;
    this.s3 = new aws.S3({ accessKeyId, secretAccessKey, region });
  }

  async getFileFromBucket(bucketName, prefix, fileName) {
    this.logger.info(`Finding file ${fileName} in bucket: ${bucketName}`);
    if (prefix) {
      // eslint-disable-next-line no-param-reassign
      fileName = `${prefix}${fileName}`;
    }
    const params = createAWSParams(bucketName, fileName);
    const data = await this.s3.listObjects(params).promise();
    this.logger.trace(`Found data: ${JSON.stringify(data)}`);
    const foundFiles = data.Contents.filter((item) => item.Key === fileName);
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
