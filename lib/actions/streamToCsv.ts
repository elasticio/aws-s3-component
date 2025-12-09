import Q from 'q';
import { stringify } from 'csv-stringify';
import _ from 'lodash';
import { PassThrough } from 'stream';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { messages } from '../utils/utils';
import { Credentials, buildS3Config } from '../AwsS3Client';

/**
 * Singleton instance for streaming
 */
let outStream: any;
let counter = 0;
let fileIndex = 1;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg: any, cfg: Credentials): void {
  const self = this;

  function prepareStreams(): any {
    if (!outStream) {
      const s3client = new S3Client(buildS3Config(cfg));
      const csvConfig = cfg.csv || {};
      const columnConfig = csvConfig.columns || [];
      if (columnConfig.length === 0) {
        throw new Error('Columns can not be empty');
      }
      const columns: { [key: string]: string } = {};
      _.map(columnConfig, (column) => {
        columns[column.property] = column.title;
      });
      const stringifier = stringify({ header: true, columns });
      const passThrough = new PassThrough();
      const upload = new Upload({
        client: s3client,
        params: {
          Bucket: cfg.bucketName,
          Key: `${cfg.keyName + fileIndex}.csv`,
          ContentType: 'text/csv',
          Body: passThrough,
        },
      });
      upload.done().catch((err) => self.emit('error', err));
      stringifier.pipe(passThrough);
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

  function writeData(stream: any): void {
    stream.write(msg.body);
    counter++;
    if (counter >= 10000) {
      self.logger.info('Flushing the log file');
      if (outStream) {
        outStream.end();
      }
      outStream = null;
      counter = 0;
      fileIndex++;
    }
  }

  function emitData(): void {
    const data = messages.newMessageWithBody(msg.body);
    self.emit('data', data);
  }

  function emitError(e: Error): void {
    self.logger.error('Oops! Error occurred!');
    self.emit('error', e);
  }

  function emitEnd(): void {
    self.logger.info('Finished execution');
    self.emit('end');
  }

  Q().then(prepareStreams).then(writeData).then(emitData)
    .fail(emitError)
    .done(emitEnd);
}

export { processAction as process };