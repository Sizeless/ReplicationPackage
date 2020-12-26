
async function setup() {
  // START SETUP
  const AWS = require(root + "/aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });
  const promises = [];
  for (let i = 1; i <= 5; i++) {
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
      TableName: `long.ma.dynamoread.{{.TableName}}-${i}`
    };
    await dynamodb.createTable(params).promise();
  }
  for (let i = 1; i <= 5; i++) {
    await dynamodb.waitFor('tableExists', {
      TableName: `long.ma.dynamoread.{{.TableName}}-${i}`
    }).promise();
    for (let j = 0; j < i * 100; j++) {
      promises.push(dynamodb.putItem({
        Item: {
          "id": {
            S: `${j}`
          },
          "a": {
            N: `${j}`
          },
          "b": {
            N: `${j}`
          },
          "c": {
            N: `${j}`
          },
          "d": {
            N: `${j}`
          },
          "e": {
            N: `${j}`
          },
          "f": {
            N: `${j}`
          }
        },
        TableName: `long.ma.dynamoread.{{.TableName}}-${i}`
      }).promise());
    }
  }
  console.log("Successfully created DynamoDB read tables for function {{.FunctionName}}");
  await Promise.all(promises);
  console.log("Successfully prefill DynamoDB read tables for function {{.FunctionName}}");
  // END SETUP
}
