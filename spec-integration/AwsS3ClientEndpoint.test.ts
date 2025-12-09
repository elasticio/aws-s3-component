import 'dotenv/config';
import { describe, test } from 'node:test';
import assert from 'node:assert';
import nock from 'nock';
import getLogger from '@elastic.io/component-logger';
import { AwsS3Client, Credentials } from '../lib/AwsS3Client';

describe('AwsS3Client endpoint integration (custom endpoint)', () => {
  const logger = getLogger();

  test('uses custom endpoint for listBucketNames', async () => {
    const endpoint = 'https://custom-s3.local';
    const cfg: Credentials = {
      accessKeyId: 'id',
      accessKeySecret: 'secret',
      region: 'us-east-1',
      endpoint,
    };

    const listBucketsXml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <Owner>
          <ID>owner</ID>
          <DisplayName>owner</DisplayName>
        </Owner>
        <Buckets>
          <Bucket>
            <Name>test-bucket</Name>
            <CreationDate>2020-01-01T00:00:00.000Z</CreationDate>
          </Bucket>
        </Buckets>
      </ListAllMyBucketsResult>
    `;

    const scope = nock(endpoint)
      .get('/')
      .reply(200, listBucketsXml, { 'Content-Type': 'application/xml' });

    const client = new AwsS3Client({ logger }, cfg);
    const buckets = await client.listBucketNames();

    assert.deepStrictEqual(buckets, ['test-bucket']);
    assert.ok(scope.isDone(), 'Expected request to custom endpoint');
  });
});

