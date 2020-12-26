exports.workload = async (event) => {
  // START FUNCTION
  const { v4: uuidv4 } = require('uuid');
  const AWS = require("aws-sdk");
  const fileSizes = [256000, 512000, 768000, 1024000];
  const fileSize = fileSizes[~~(Math.random() * 4)];
  const data = []
  for (let i = 0; i < fileSize; i++) {
    data.push(~~(Math.random() * 256));
  }
  await new AWS.S3().upload({
    Bucket: "long.ma.s3write.{{.BucketName}}",
    Key: uuidv4(),
    Body: Buffer.from(data)
  }).promise();
  // END FUNCTION
}