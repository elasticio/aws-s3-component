/* eslint-disable no-plusplus,no-console,no-use-before-define */
/* eslint new-cap: [2, {"capIsNewExceptions": ["Q"]}] */
const Q = require('q');
const elasticio = require('elasticio-node');
const AWS = require('aws-sdk');
const s3Stream = require('s3-upload-stream');
const csvParser = require('csv');
const _ = require('lodash');

const { messages } = elasticio;

/**
 * Singleton instance for streaming
 */
let outStream;
let counter = 0;
let fileIndex = 1;

module.exports.process = processAction;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
  const self = this;

  function prepareStreams() {
    if (!outStream) {
      const s3client = new AWS.S3({
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.accessKeySecret,
        region: cfg.region,
      });
      const streamClient = s3Stream(s3client);
      const csv = cfg.csv || {};
      const columnConfig = csv.columns || [];
      if (columnConfig.length === 0) {
        throw new Error('Columns can not be empty');
      }
      const columns = {};
      _.map(columnConfig, (column) => {
        columns[column.property] = column.title;
      });
      const stringifier = csvParser.stringify({ header: true, columns });
      const upload = streamClient.upload({
        Bucket: cfg.bucketName,
        Key: `${cfg.keyName + fileIndex}.csv`,
        ContentType: 'text/csv',
      });
      stringifier.pipe(upload);
      outStream = stringifier;
      // Register shutdown hook
      process.on('exit', () => {
        self.logger.info('Shutting down');
        stringifier.end();
        self.logger.info('Shutdown completed');
      });
    }
    return outStream;
  }

  function writeData(stream) {
    stream.write(msg.body);
    counter++;
    if (counter >= 10000) {
      self.logger.info('Flushing the log file');
      outStream.end();
      outStream = null;
      counter = 0;
      fileIndex++;
    }
  }

  function emitData() {
    const data = messages.newMessageWithBody(msg.body);
    self.emit('data', data);
  }

  function emitError(e) {
    self.logger.error('Oops! Error occurred!');
    self.emit('error', e);
  }

  function emitEnd() {
    self.logger.info('Finished execution');
    self.emit('end');
  }

  Q().then(prepareStreams).then(writeData).then(emitData)
    .fail(emitError)
    .done(emitEnd);
}
