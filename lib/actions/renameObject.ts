import { AwsS3Client, Credentials, S3Object } from '../AwsS3Client';
import { checkFieldNotFolder, formatFolder, messages } from '../utils/utils';

let client: AwsS3Client;

export async function process(this: any, msg: any, cfg: Credentials): Promise<any> {
    this.logger.info('Starting "Rename Object" action..');
    client ||= new AwsS3Client(this, cfg);
    client.setLogger(this.logger);

    const { bucketName, oldFileName, newFileName } = msg.body;
    if (!bucketName) {
        throw new Error(`Bucket name cannot be empty. Provided bucket name: ${bucketName}`);
    }
    checkFieldNotFolder('bucketName', bucketName);
    checkFieldNotFolder('oldFileName', oldFileName);
    checkFieldNotFolder('newFileName', newFileName);
    const folder = formatFolder(msg.body.folder);
    const fullOldFileName = `${folder || ''}${oldFileName}`;
    const fullNewFileName = `${folder || ''}${newFileName}`;
    let newFile: S3Object | null = null;
    try {
        const oldFile = await client.getFileFromBucket(bucketName, fullOldFileName);
        if (!oldFile) {
            throw new Error(`File with name ${fullOldFileName} doesn't exists in bucket ${bucketName}`);
        }
    } catch (error) {
        throw new Error(`Error getting object from bucket ${bucketName}: ${error}`);
    }
    try {
        newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
        if (newFile) {
            throw new Error(`File with name ${fullNewFileName} already exists in bucket ${bucketName}`);
        }
    } catch (error) {
        throw new Error(`Error getting object from bucket ${bucketName}: ${error}`);
    }
    try {
        this.logger.trace('Starting copyObject...');
        const copyResult = await client.copyObject(`${bucketName}/${fullOldFileName}`, bucketName, fullNewFileName);
        this.logger.trace('CopyResult received');
        if (!copyResult) {
            throw new Error(`Error copying object from ${fullOldFileName} to ${fullNewFileName}`);
        }
        newFile = await client.getFileFromBucket(bucketName, fullNewFileName);
        if (!newFile) {
            throw new Error(`Error copying object from ${fullOldFileName} to ${fullNewFileName}`);
        }
    } catch (error) {
        throw new Error(`Error copying object from ${fullOldFileName} to ${fullNewFileName}: ${error}`);
    }
    try {
        this.logger.trace('Starting delete old file...');
        await client.deleteObject(bucketName, fullOldFileName);
        this.logger.info('File successfully renamed');
    } catch (error) {
        throw new Error(`Error deleting object from ${fullOldFileName}: ${error}`);
    }
    return messages.newMessageWithBody(newFile);
}