async function func() {
  // START FUNCTION
  const AWS = require("aws-sdk");
  const dynamodb = new AWS.DynamoDB({ region: "eu-west-1" });
  const tableId = ~~(Math.random() * 5) + 1;
  await new Promise((res, rej) => {
    function onScan(err, data) {
      // continue scanning if we have more items
      if (typeof data.LastEvaluatedKey != "undefined") {
        params.ExclusiveStartKey = data.LastEvaluatedKey;
        docClient.scan({
          TableName: `long.ma.dynamoread.{{.TableName}}-${tableId}`
        }, onScan);
      } else {
        res();
      }
    }
    dynamodb.scan({
      TableName: `long.ma.dynamoread.{{.TableName}}-${tableId}`
    }, onScan);
  });
  // END FUNCTION
}