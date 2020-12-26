
async function setup() {
  // START SETUP
  const AWS = require(root + "/aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });
  const params = {
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ],
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    BillingMode: "PAY_PER_REQUEST",
    TableName: `long.ma.dynamowrite.{{.TableName}}`
  };
  await dynamodb.createTable(params).promise();
  await dynamodb.waitFor('tableExists', {
    TableName: `long.ma.dynamowrite.{{.TableName}}`
  }).promise();
  console.log("Successfully created DynamoDB write table for function {{.FunctionName}}");
  // END SETUP
}
