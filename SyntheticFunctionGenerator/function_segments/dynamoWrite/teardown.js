async function teardown() {
  // START TEARDOWN
  const AWS = require(root + "/aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });
  await dynamodb.deleteTable({
    TableName: `long.ma.dynamowrite.{{.TableName}}`
  }).promise();
  console.log("Successfully teardown DynamoDB Tables for function {{.FunctionName}}");
  // END TEARDOWN
}