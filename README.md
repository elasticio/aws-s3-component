# aws-s3-component [![CircleCI](https://circleci.com/gh/elasticio/aws-s3-component.svg?style=svg)](https://circleci.com/gh/elasticio/aws-s3-component) [![Dependency Status][daviddm-image]][daviddm-url]
## Table of Contents

* [General information](#general-information)
   * [Description](#description)
   * [Purpose](#purpose)
   * [Completeness Matrix](#completeness-matrix)
   * [How works. SDK version](#how-works.-sdk-version)
* [Requirements](#requirements)
   * [Environment variables](#environment-variables)
* [Credentials](#credentials)
     * [Access Key Id](#access-key-id)
     * [Secret Access Key](#secret-access-key)
     * [Region](#region)
* [Actions](#actions)
   * [Write file](#write-file)
   * [Read file](#read-file)
   * [Get filenames](#get-filenames)
* [Additional info](#additional-info)
* [Known Limitations](#known-limitations)
* [<External System> API and Documentation links](#<external system>-api-and-documentation-links)
AWS S3 component for the [elastic.io platform](http://www.elastic.io 'elastic.io platform')

## General information  
### Description  
This is the component for working with AWS S3 object storage service on [elastic.io platform](http://www.elastic.io/ "elastic.io platform").

### Purpose  
The component provides ability to connect to Amazon Simple Storage Service (Amazon S3) object storage service.

### Completeness Matrix
![image](https://user-images.githubusercontent.com/36419533/70732156-97b31680-1d10-11ea-826f-5a2dd55b8251.png)

[Completeness Matrix](https://docs.google.com/spreadsheets/d/1LhKgsTvF32YAmBRh742YxnkrMEGlPEERJc9B6pj4L6E/edit#gid=0)

### How works. SDK version  
The component is based on [AWS S3 SDK](https://aws.amazon.com/sdk-for-node-js/ 'SDK for NodeJS') version 2.314.0.

## Requirements

#### Environment variables
For integration-tests is required to specify following environment variables:
`ACCESS_KEY_ID` - access key ID;
`ACCESS_KEY_SECRET` - secret access key.
`REGION` - region.

## Credentials
Access keys consist of two parts: an access key ID and a secret access key. 
Like a user name and password, you must use both the access key ID and secret access key together to authenticate your requests.
According to [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html#access-bucket-intro) for buckets created in Regions launched after March 20, 2019 `Region` is required for AWS credential.
### Access Key Id
An access key ID (for example, `AKIAIOSFODNN7EXAMPLE`).

### Secret Access Key
A secret access key (for example, `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`).

### Region
Example: `ca-central-1`.
 

## Actions
### Write file
Put stream as file into S3 bucket.
This action creates or rewrites a new file on S3 with the content that is passed as an input attachment.
The name of the file would be the same to the attachment name.
Be careful: this action can process only one attachment - if it would be more or no attachment at all the execution would fail with exception.
#### List of Expected Config fields
 - **Default Bucket Name** - name of S3 bucket to write file in (by default, if `bucketName` is not provided in metadata);
 
#### Expected input metadata
 - **filename** - name of resulted file at S3 bucket (optional);
 - **bucketName** - name of S3 bucket to write file in (will replace `Default Bucket Name` if provided, the field is optional).
 
![image](https://user-images.githubusercontent.com/40201204/59688384-448b5b80-91e6-11e9-8dd0-e007983055c8.png)

<details> 
<summary>Input metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "filename": {
      "type": "string",
      "required": false
    },
    "bucketName": {
      "type": "string",
      "required": false
    }
  }
}
```
</details>

#### Expected output metadata

<details> 
<summary>Output metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "ETag": {
      "type": "string",
      "required": true
    },
    "Location": {
      "type": "string",
      "required": false
    },
    "Key": {
      "type": "string",
      "required": true
    },
    "Bucket": {
      "type": "string",
      "required": true
    }
  }
}
```
</details>

### Read file  
Read file from S3 bucket.
This action reads file from S3 bucket by provided name. The result is storing in the output body (for json or xml) or in the output attachment (for other types).
File type resolves by it's extension. The name of attachment would be same to filename.

#### List of Expected Config fields
 - **Default Bucket Name** - name of S3 bucket to read file from (by default, if `bucketName` is not provided in metadata);
 
#### Expected input metadata
 - **filename** - name of file at S3 bucket to read;
 - **bucketName** - name of S3 bucket to read file from (will replace `Default Bucket Name` if provided, the field is optional).
![image](https://user-images.githubusercontent.com/40201204/59688635-ced3bf80-91e6-11e9-8c17-a172a1dadce2.png)

<details> 
<summary>Input metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "filename": {
      "type": "string",
      "required": true
    },
    "bucketName": {
      "type": "string",
      "required": false
    }
  }
}
```
</details>

#### Expected output metadata

<details> 
<summary>Output metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "filename": {
      "type": "string",
      "required": true
    }
  }
}
```
</details>

### Get filenames
Emit individually all filenames from S3 bucket.
This action gets all names of files which are storing in S3 bucket with provided name. 
The filenames emits individually.

**Notice**: if you provide bucket and folder (as example `eio-dev/inbound`), not only all names of files will  return but name of root folder (`inbound/') as well.

#### List of Expected Config fields
 - **Default Bucket Name** - name of S3 bucket to read file from (by default, if `bucketName` is not provided in metadata);

#### Expected input metadata
 - **bucketName** - name of S3 bucket to write file from (will replace `Default Bucket Name` if provided, the field is optional).
![image](https://user-images.githubusercontent.com/40201204/59688813-1fe3b380-91e7-11e9-8f54-a90b2b601eea.png)
<details> 
<summary>Input metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "bucketName": {
      "type": "string",
      "required": false
    }
  }
}
```
</details>

#### Expected output metadata

<details> 
<summary>Output metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "ETag": {
      "type": "string",
      "required": true
    },
    "Location": {
      "type": "string",
      "required": false
    },
    "Key": {
      "type": "string",
      "required": true
    },
    "Bucket": {
      "type": "string",
      "required": true
    }
  }
}
```
</details>

#### Known limitations
It is possible to retrieve maximum 1000 file names.

### Delete file
Delete file from S3 bucket.

This action removes file from S3 by provided name in selected bucket. The action will emit single filename of removed file.
### Input fields
 - **Default Bucket Name** - name of S3 bucket to delete file from (by default, if `bucketName` is not provided);
 - **filename** - name of file at S3 bucket to delete;
 - **bucketName** - name of S3 bucket to delete file from (will replace `Default Bucket Name` if provided, the field is optional).
![image](https://user-images.githubusercontent.com/40201204/59688635-ced3bf80-91e6-11e9-8c17-a172a1dadce2.png)

### Stream to CSV
Action is deprecated. Use `Write file` action instead.

### Limitations

1. Maximal possible size for an attachment is 10 MB.
2. Attachments mechanism does not work with [Local Agent Installation](https://support.elastic.io/support/solutions/articles/14000076461-announcing-the-local-agent-)

## License

Apache-2.0 © [elastic.io GmbH](http://elastic.io)

[travis-image]: https://travis-ci.org/elasticio/aws-s3-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/aws-s3-component
[daviddm-image]: https://david-dm.org/elasticio/aws-s3-component.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/aws-s3-component
