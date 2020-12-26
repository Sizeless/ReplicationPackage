async function teardown() {
  // START TEARDOWN
  const AWS = require(root + "/aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });
  const promises = [];
  for (let i = 1; i <= 5; i++) {
    promises.push(dynamodb.deleteTable({
      TableName: `long.ma.dynamoread.{{.TableName}}-${i}`
    }).promise());
  }
  await Promise.all(promises);
  console.log("Successfully teardown DynamoDB Tables for function {{.FunctionName}}");
  // END TEARDOWN
}