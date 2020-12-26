exports.setup = async () => {
  // START SETUP
  const AWS = require(root + "/aws-sdk");
  const S3 = new AWS.S3();

  const params = {
    Bucket: "long.ma.s3read.{{.BucketName}}",
    CreateBucketConfiguration: {
      LocationConstraint: "eu-west-1"
    }
  };
  try {
    await S3.createBucket(params).promise();
    console.log(`successfully created S3 Bucket ${params.Bucket}`);
  } catch (error) {
    process.exit(1);
  }

  // Prefill bucket with testdata
  const fileSizes = [256000, 512000, 768000, 1024000];
  const promises = [];
  for (let i = 0; i < fileSizes.length; i++) {
    const fileSize = fileSizes[i];
    const data = [];
    for (let j = 0; j < fileSize; j++) {
      data.push(~~(Math.random() * 256));
    }
    promises.push(new AWS.S3().upload({
      Bucket: params.Bucket,
      Key: "file" + i,
      Body: Buffer.from(data)
    }).promise());
  }
  await Promise.all(promises);
  console.log(`successfully prefilled S3 Bucket ${params.Bucket}`);
  // END SETUP
}