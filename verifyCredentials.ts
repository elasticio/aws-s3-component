import { AwsS3Client, Credentials } from './lib/AwsS3Client';

export = async function verifyCredentials(cfg: Credentials): Promise<{ verified: boolean }> {
    this.logger.info('Verification started');
    const { accessKeyId, accessKeySecret: secretAccessKey, region } = cfg;

    if (!accessKeyId || !secretAccessKey || !region) {
        const errMessage = 'Parameters accessKeyId, secretAccessKey and region are required';
        this.logger.error(errMessage);
        throw new Error(errMessage);
    }
    const client = new AwsS3Client(this, cfg);
    try {
        const bucketsNames = await client.listBucketNames();
        if (bucketsNames.length < 1) {
            this.logger.info('API keys are valid but they don\'t have permission to manipulate any existing buckets.');
        } else {
            this.logger.info('The provided API keys have access the buckets');
        }
    } catch (e) {
        this.logger.error(`Verification failed: ${e?.message || 'Unknown error'}`);
        return { verified: false };
    }
    this.logger.info('Verification succeeded');
    return { verified: true };
}

