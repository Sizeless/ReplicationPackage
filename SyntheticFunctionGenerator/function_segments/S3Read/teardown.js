const teardown = async () => {
  // START TEARDOWN
  const AWS = require(root + "/aws-sdk");
  const S3 = new AWS.S3();

  const params = {
    Bucket: "long.ma.s3read.{{.BucketName}}"
  };
  try {
    await S3.deleteObjects({
      Bucket: params.Bucket,
      Delete: {
        Objects: [
          {
            Key: "file0"
          },
          {
            Key: "file1"
          },
          {
            Key: "file2"
          },
          {
            Key: "file3"
          }
        ]
      }
    }).promise();
    await S3.deleteBucket(params).promise();
    console.log(`successfully deleted S3 Bucket ${params.Bucket}`);
  } catch (exception) {
    console.log(exception); // an error occurred
  }
  // END TEARDOWN
}