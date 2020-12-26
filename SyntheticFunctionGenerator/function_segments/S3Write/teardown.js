export async function teardown() {
  // START TEARDOWN
  const AWS = require(root + "/aws-sdk");
  const S3 = new AWS.S3();

  async function deleteAll(params) {
    let result = await S3.listObjectsV2(params).promise();
    await S3.deleteObjects({
      Bucket: params.Bucket,
      Delete: {
        Objects: result.Contents.map(obj => { return { Key: obj.Key } })
      }
    }).promise();
    if (result.IsTruncated) {
      params.ContinuationToken = result.NextContinuationToken;
      return await deleteAll(params);
    }
  }
  await deleteAll({
    Bucket: "long.ma.s3write.{{.BucketName}}"
  });
  await S3.deleteBucket({
    Bucket: "long.ma.s3write.{{.BucketName}}"
  }).promise();
  console.log("successfully deleted S3 Bucket long.ma.s3write.{{.BucketName}}");
  // END TEARDOWN
}