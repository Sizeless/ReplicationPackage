async function func() {
  // START FUNCTION
  const { v4: uuidv4 } = require('uuid');
  const AWS = require("aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });

  const numOfRequests = ~~(Math.random() * 3) + 1;
  for (let j = 0; j < numOfRequests; j++) {
    await dynamodb.putItem({
      Item: {
        "id": {
          S: uuidv4()
        },
        "a": {
          S: `dataA-${j}`
        },
        "b": {
          S: `dataB-${j}`
        },
        "c": {
          S: `dataC-${j}`
        }
      },
      TableName: `long.ma.dynamowrite.{{.TableName}}`
    }).promise();
  }
  // END FUNCTION
}