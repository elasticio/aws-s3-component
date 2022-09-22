const packageJson = require('../../package.json');
const compJson = require('../../component.json');

exports.getUserAgent = () => {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const libVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${libVersion}`;
};

function createAWSInputs(bucketName) {
  let name = bucketName;
  if (bucketName.startsWith('/')) {
    name = bucketName.substring(1);
  }
  if (name.indexOf('/') > -1) {
    const index = name.indexOf('/');
    const folder = `${name.substring(index + 1)}/`;
    const bucket = name.substring(0, index);
    return { Bucket: bucket, Delimiter: '/', Prefix: folder };
  }
  return { Bucket: name };
}
module.exports.createAWSInputs = createAWSInputs;
