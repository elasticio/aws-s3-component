import { AwsS3Client } from '../AwsS3Client';
import { createAWSInputs, messages } from '../utils/utils';
import { AwsS3Polling } from '../utils/pollingUtil';

let client: AwsS3Client;

export async function process(this: any, msg: any, cfg: any): Promise<void> {
  this.logger.info('Starting "Read File" action..');

  client ||= new AwsS3Client(this, cfg);
  client.setLogger(this.logger);

  const { bucketName } = cfg;
  const { keyRegex } = msg.body;

  const awsInput = createAWSInputs(bucketName);

  const startTime = new Date('0');
  const endTime = new Date();

  if (keyRegex === '') {
    throw new Error('No search pattern set to filter');
  }

  const pollingTrigger = new AwsS3Polling(this, client, cfg);

  const results = (
    await pollingTrigger.getObjects({ startTime, endTime })
  ).filter((object) => object.Key.search(keyRegex) !== -1);

  for (let i = 0; i < results.length; i += 1) {
    const object = messages.newMessageWithBody(results[i]);

    object.body.SignedUrl = await client.getSignedUrl(awsInput.Bucket, results[i].Key, (7 * 24 * 60 * 60 * 60));

    await this.emit('data', object);
  }

  this.emit('end');
}
