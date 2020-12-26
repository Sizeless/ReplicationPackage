exports.workload = async (event) => {
  // START FUNCTION
  const AWS = require("aws-sdk");
  const fileId = ~~(Math.random() * 4);
  await new AWS.S3().getObject({
    Bucket: "long.ma.s3read.{{.BucketName}}",
    Key: "file" + fileId
  }).promise();
  // END FUNCTION
}