const chai = require('chai');
const utils = require('../../lib/utils/utils');

const { expect } = chai;

describe('Bucket name validation', () => {
  describe('Success validations', () => {
    it('Bucket name with 3<length<63 should success', async () => {
      const bucketName = 'abcd-efgh-ijkl-mnop';
      const objectToCompare = { Bucket: 'abcd-efgh-ijkl-mnop' };
      expect(utils.createAWSInputs(bucketName))
        .to
        .deep
        .equal(objectToCompare);
    });
  });

  describe('Fail validation', () => {
    it('Bucket name with length<3 should fail', async () => {
      const bucketName = 'ab';
      expect(utils.createAWSInputs.bind(utils.createAWSInputs, bucketName)).to.throw();
    });

    it('Bucket name with length>63 should fail', async () => {
      const bucketName = '7QpHCMHqKZ8pYuZC5tmzDM0hcNnKX6UBo6058gOwgabTFBjZWA96ZVlljnZFf2MW\n';
      expect(utils.createAWSInputs.bind(utils.createAWSInputs, bucketName)).to.throw();
    });

    it('Bucket name can that contains underscore should fail', async () => {
      const bucketName = 'abc_de';
      expect(utils.createAWSInputs.bind(utils.createAWSInputs, bucketName)).to.throw();
    });

    it('Bucket name that contains uppercase letter should fail', async () => {
      const bucketName = 'abcDe';
      expect(utils.createAWSInputs.bind(utils.createAWSInputs, bucketName)).to.throw();
    });
  });
});
