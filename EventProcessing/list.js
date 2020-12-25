'use strict';
const { v4: uuidv4 } = require('uuid');
const createDBQuery = "CREATE TABLE IF NOT EXISTS events (ID int unsigned NOT NULL auto_increment PRIMARY KEY, source VARCHAR(255) NOT NULL, timestamp int unsigned NOT NULL, message VARCHAR(1000) NOT NULL);"
const aws = require('aws-sdk')

const mysql = require('serverless-mysql')({
  config: {
    database: process.env.RDS_DB_NAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOST,
    port: process.env.RDS_PORT
  }
});

const lambdahandler1 = async (event) => {
  await mysql.query(createDBQuery);

  let result = await mysql.query({
    sql: 'SELECT * FROM events ORDER BY ID DESC;',
    timeout: 10000
  });
  console.log(result);
  await mysql.end();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
};

const lambdahandler2 = async (event) => {
  await mysql.query(createDBQuery);

  let result = await mysql.query({
    sql: 'SELECT * FROM events ORDER BY ID DESC LIMIT 1;',
    timeout: 10000
  });
  console.log(result);
  await mysql.end();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
};
// monitoring function wrapping arbitrary payload code
async function handler(event, context, payload, bucketname) {
  const child_process = require("child_process");
  const v8 = require("v8");
  const { performance, PerformanceObserver, monitorEventLoopDelay } = require("perf_hooks");
  const [beforeBytesRx, beforePkgsRx, beforeBytesTx, beforePkgsTx] =
    child_process.execSync("cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'").toString().split(" ");
  const startUsage = process.cpuUsage();
  const beforeResourceUsage = process.resourceUsage();
  const wrapped = performance.timerify(payload);
  const h = monitorEventLoopDelay();
  h.enable();

  const durationStart = process.hrtime();

  const ret = await wrapped(event, context);
  h.disable();

  const durationDiff = process.hrtime(durationStart);
  const duration = (durationDiff[0] * 1e9 + durationDiff[1]) / 1e6

  // Process CPU Diff
  const cpuUsageDiff = process.cpuUsage(startUsage);
  // Process Resources
  const afterResourceUsage = process.resourceUsage();

  // Memory
  const heapCodeStats = v8.getHeapCodeStatistics();
  const heapStats = v8.getHeapStatistics();
  const heapInfo = process.memoryUsage();

  // Network
  const [afterBytesRx, afterPkgsRx, afterBytesTx, afterPkgsTx] =
    child_process.execSync("cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'").toString().split(" ");

  const dynamodb = new aws.DynamoDB({ region: 'eu-west-1' });
  console.log(bucketname)
  if (!event.warmup)
    await dynamodb.putItem({
      Item: {
        "id": {
          S: uuidv4()
        },
        "duration": {
          N: `${duration}`
        },
        "maxRss": {
          N: `${afterResourceUsage.maxRSS - beforeResourceUsage.maxRSS}`
        },
        "fsRead": {
          N: `${afterResourceUsage.fsRead - beforeResourceUsage.fsRead}`
        },
        "fsWrite": {
          N: `${afterResourceUsage.fsWrite - beforeResourceUsage.fsWrite}`
        },
        "vContextSwitches": {
          N: `${afterResourceUsage.voluntaryContextSwitches - beforeResourceUsage.voluntaryContextSwitches}`
        },
        "ivContextSwitches": {
          N: `${afterResourceUsage.involuntaryContextSwitches - beforeResourceUsage.involuntaryContextSwitches}`
        },
        "userDiff": {
          N: `${cpuUsageDiff.user}`
        },
        "sysDiff": {
          N: `${cpuUsageDiff.system}`
        },
        "rss": {
          N: `${heapInfo.rss}`
        },
        "heapTotal": {
          N: `${heapInfo.heapTotal}`
        },
        "heapUsed": {
          N: `${heapInfo.heapUsed}`
        },
        "external": {
          N: `${heapInfo.external}`
        },
        "elMin": {
          N: `${h.min}`
        },
        "elMax": {
          N: `${h.max}`
        },
        "elMean": {
          N: `${isNaN(h.mean) ? 0 : h.mean}`
        },
        "elStd": {
          N: `${isNaN(h.stddev) ? 0 : h.stddev}`
        },
        "bytecodeMetadataSize": {
          N: `${heapCodeStats.bytecode_and_metadata_size}`
        },
        "heapPhysical": {
          N: `${heapStats.total_physical_size}`
        },
        "heapAvailable": {
          N: `${heapStats.total_available_size}`
        },
        "heapLimit": {
          N: `${heapStats.heap_size_limit}`
        },
        "mallocMem": {
          N: `${heapStats.malloced_memory}`
        },
        "netByRx": {
          N: `${afterBytesRx - beforeBytesRx}`
        },
        "netPkgRx": {
          N: `${afterPkgsRx - beforePkgsRx}`
        },
        "netByTx": {
          N: `${afterBytesTx - beforeBytesTx}`
        },
        "netPkgTx": {
          N: `${afterPkgsTx - beforePkgsTx}`
        }
      },
      TableName: `${bucketname}`
    }, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data.Item);
  }
}).promise();

  return ret;
};

exports.handleList = async (event, context, callback) => {
  return await handler(event, context, lambdahandler1, 'list');
} 

exports.handleLatest = async (event, context, callback) => {
  return await handler(event, context, lambdahandler2, 'latest');
} 
