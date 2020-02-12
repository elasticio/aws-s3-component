/* eslint-disable no-return-await */
const aws = require('aws-sdk');

class Client {
  constructor(logger, credentials) {
    this.logger = logger;
    const { accessKeyId, accessKeySecret: secretAccessKey, region } = credentials;
    this.s3 = new aws.S3({ accessKeyId, secretAccessKey, region });
  }

  async exist(bucketName) {
    const params = {
      Bucket: bucketName.split('/')[0],
    };
    try {
      const response = await this.s3.headBucket(params).promise();
      const { statusCode } = response.$response.httpResponse;
      return statusCode === 200;
    } catch (e) {
      if (e.code === 'NotFound') {
        return false;
      }
      if (!e.message) {
        e.message = `${e.code}: bucket name was '${params.Bucket}'`;
      }
      throw e;
    }
  }

  async getFileFromBucket(bucketName, fileName) {
    this.logger.info(`Finding file ${fileName} in bucket: ${bucketName}`);
    const params = {
      Bucket: bucketName,
      Delimiter: '/',
      Prefix: fileName,
    };
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
      CopySource: encodeURIComponent(copySource),
      Bucket: bucketName,
      Key: key,
    };
    return this.s3.copyObject(params).promise();
  }

  async listObjects(awsInput, prefix) {
    const params = awsInput;
    let isTruncated = true;
    let marker;
    let chunk;
    let response = [];
    while (isTruncated) {
      if (prefix) params.Prefix = prefix;
      if (marker) params.Marker = marker;
      // eslint-disable-next-line no-await-in-loop
      chunk = await this.s3.listObjects(params)
        .promise();
      response = response.concat(chunk.Contents);
      isTruncated = chunk.IsTruncated;
      if (isTruncated) {
        marker = chunk.Contents.pop().Key;
      }
    }
    return response;
  }

  async getObjectMetadata(bucketName, fileName) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    return this.s3.headObject(params).promise();
  }

  async getObject(bucketName, fileName) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    return this.s3.getObject(params).promise();
  }

  async getObjectReadStream(bucketName, fileName) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };
    return this.s3.getObject(params).createReadStream();
  }

  async deleteObject(bucketName, fileName) {
    return this.s3.deleteObject({ Bucket: bucketName, Key: fileName }).promise();
  }

  async upload(bucketName, fileName, body) {
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: body,
    };
    return this.s3.upload(params).promise();
  }
}
module.exports.Client = Client;
