async function func() {
  // START FUNCTION
  const { v4: uuidv4 } = require('uuid');
  const AWS = require("aws-sdk");
  const S3 = new AWS.S3();
  const fileId = ~~(Math.random() * 4);
  const readStream = S3.getObject({
    Bucket: "long.ma.s3stream.{{.BucketName}}",
    Key: "file" + fileId
  }).createReadStream();
  await S3.upload({
    Bucket: "long.ma.s3stream.{{.BucketName}}",
    Key: uuidv4(),
    Body: readStream
  }).promise();
  // END FUNCTION
}