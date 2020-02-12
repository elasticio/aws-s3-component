# aws-s3-component
## Table of Contents

* [General information](#general-information)
   * [Description](#description)
   * [Purpose](#purpose)
   * [Completeness Matrix](#completeness-matrix)
   * [How works. SDK version](#how-works-sdk-version)
* [Requirements](#requirements)
   * [Environment variables](#environment-variables)
* [Credentials](#credentials)
     * [Access Key Id](#access-key-id)
     * [Secret Access Key](#secret-access-key)
     * [Region](#region)
* [Triggers](#triggers)
   * [Get New and Updated S3 Objects](#get-new-and-updated-s3-objects)
* [Actions](#actions)
   * [Write file](#write-file)
   * [Read file](#read-file)
   * [Get filenames](#get-filenames)
   * [Delete file](#delete-file)
   * [Rename file](#rename-file)
* [Known Limitations](#known-limitations)
* [License](#license)

## General information  
AWS S3 component for the [elastic.io platform](http://www.elastic.io 'elastic.io platform')
### Description  
This is the component for working with AWS S3 object storage service on [elastic.io platform](http://www.elastic.io/ "elastic.io platform").

### Purpose  
The component provides ability to connect to Amazon Simple Storage Service (Amazon S3) object storage service.

### Completeness Matrix
![image](https://user-images.githubusercontent.com/22715422/73740795-93740a00-4751-11ea-869d-ff9433f39c4f.png)

[Completeness Matrix](https://docs.google.com/spreadsheets/d/1LhKgsTvF32YAmBRh742YxnkrMEGlPEERJc9B6pj4L6E/edit#gid=0)

### How works. SDK version  
The component is based on [AWS S3 SDK](https://aws.amazon.com/sdk-for-node-js/ 'SDK for NodeJS') version 2.314.0.

## Requirements

#### Environment variables
Name|Mandatory|Description|Values|
|----|---------|-----------|------|
|`LOG_LEVEL`| false | Controls logger level | `trace`, `debug`, `info`, `warning`, `error` |
|`ATTACHMENT_MAX_SIZE`| false | For `elastic.io` attachments configuration. Maximal possible attachment size in bytes. By default set to 1000000 and according to platform limitations CAN'T be bigger than that. | Up to `1000000` bytes|
|`ACCESS_KEY_ID`| false | For integration-tests is required to specify this variable |  |
|`ACCESS_KEY_SECRET`| false | For integration-tests is required to specify this variable |  |
|`REGION`  | false | For integration-tests is required to specify this variable |  |

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


## Triggers
### Get New and Updated S3 Objects
Triggers to get all new and updated s3 objects since last polling.

#### List of Expected Config fields
 - **Bucket Name and folder** - name of S3 bucket to read files from
 - **Emit Behaviour**: Options are: default is `Emit Individually` emits each object in separate message, `Fetch All` emits all objects in one message
 - **Start Time**: Start datetime of polling. Default min date:`-271821-04-20T00:00:00.000Z`
 - **End Time**: End datetime of polling. Default max date: `+275760-09-13T00:00:00.000Z`
 - **Enable File Attachments**: End datetime of polling. Default max date: `+275760-09-13T00:00:00.000Z`

<details> 
<summary>Output metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "Key": {
      "type": "string",
      "required": true
    },
    "LastModified": {
      "type": "string",
      "required": true
    },
    "ETag": {
      "type": "string",
      "required": true
    },
    "Size": {
      "type": "number",
      "required": true
    },
    "StorageClass": {
      "type": "string",
      "required": true
    },
    "Owner": {
      "type": "object",
      "properties": {
        "ID": {
          "type": "string",
          "required": true
        }
      }
    }
  }
}
```
</details>

## Actions
### Write file
Put stream as file into S3 bucket.
This action creates or rewrites a new file on S3 with the content that is passed as an input attachment.
The name of the file would be the same to the attachment name.
Be careful: this action can process only one attachment - if it would be more or no attachment at all the execution would fail with exception.
#### List of Expected Config fields
 - **Default Bucket Name and folder** - name of S3 bucket to write file in (by default, if `bucketName` is not provided in metadata);
 
#### Expected input metadata
 - **filename** - name of resulted file at S3 bucket (optional);
 - **bucketName** - name of S3 bucket to write file in (will replace `Default Bucket Name and folder` if provided, the field is optional).
 
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
 - **Default Bucket Name and folder** - name of S3 bucket to read file from (by default, if `bucketName` is not provided in metadata);
 
#### Expected input metadata
 - **filename** - name of file at S3 bucket to read;
 - **bucketName** - name of S3 bucket to read file from (will replace `Default Bucket Name and folder` if provided, the field is optional).
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
 - **Default Bucket Name and folder** - name of S3 bucket to read file from (by default, if `bucketName` is not provided in metadata);

#### Expected input metadata
 - **bucketName** - name of S3 bucket to write file from (will replace `Default Bucket Name and folder` if provided, the field is optional).
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
#### List of Expected Config fields
 - **Default Bucket Name and folder** - name of S3 bucket to delete file from (by default, if `bucketName` is not provided);
#### Expected input metadata
 - **filename** - name of file at S3 bucket to delete;
 - **bucketName** - name of S3 bucket and folder to delete file from (will replace `Default Bucket Name and folder` if provided, the field is optional).
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


### Rename file
Rename file in S3 bucket and folder.

This action renames file by provided name in selected bucket and folder.
The action will emit properties of renamed file.
#### Expected input metadata
 - **bucketName** - name of S3 bucket where file is placed
 - **folder** - name of folder where file is placed (can be omitted)
 - **oldFileName** - name of file that should be renamed
 - **newFileName** - new name of file

<details> 
<summary>Input metadata</summary>

```json
{
  "type": "object",
  "properties": {
    "bucketName": {
      "title":"Bucket Name",
      "type": "string",
      "required": true
    },
    "folder": {
      "type": "string",
      "required": false
    },
    "oldFileName": {
      "type": "string",
      "required": true
    },
    "newFileName": {
      "type": "string",
      "required": true
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
    "Key": {
      "type": "string",
      "required": true
    },
    "LastModified": {
      "type": "string",
      "required": true
    },
    "ETag": {
      "type": "string",
      "required": true
    },
    "Size": {
      "type": "number",
      "required": true
    },
    "StorageClass": {
      "type": "string",
      "required": true
    },
    "Owner": {
      "type": "object",
      "required": true,
      "properties": {
        "ID": {
          "type": "string",
          "required": true
        }
      }
    }
  }
}
```
</details>

### Stream to CSV
Action is deprecated. Use `Write file` action instead.

## Known Limitations

1. Maximal possible size for an attachment is 10 MB.
2. Attachments mechanism does not work with [Local Agent Installation](https://support.elastic.io/support/solutions/articles/14000076461-announcing-the-local-agent-)

## License

Apache-2.0 © [elastic.io GmbH](http://elastic.io)

[daviddm-image]: https://david-dm.org/elasticio/aws-s3-component.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/aws-s3-component
