'use strict';
const { v4: uuidv4 } = require('uuid');
const aws = require('aws-sdk')
const sqs = new aws.SQS({ region: process.env.CLOUD_REGION })

const getUnixTime = () => {
  return new Date().getTime()/1000|0
}
const getQueueURL = () => {
  return 'https://sqs.'+process.env.CLOUD_REGION+'.amazonaws.com/' +
       process.env.CLOUD_ACCOUNT_ID + '/'+ process.env.QUEUE_NAME;
};

const lambdahandler1 = async (event) => {
  let tempEvent = JSON.parse(event.Records[0].Sns.Message);

  console.log(JSON.stringify(tempEvent));

  let message = "Measured Temperature "+ tempEvent.value + " on device "+  tempEvent.source;

  let evt = {
    type: tempEvent.type,
    source: tempEvent.source,
    timestamp: tempEvent.timestamp,
    formatting_timestamp: getUnixTime(),
    message: message
  }

  let messageString = JSON.stringify(evt);
  console.log(messageString);
  console.log(getQueueURL());

  var params = {
    MessageBody: messageString,
    QueueUrl: getQueueURL()
  };

  sqs.sendMessage(params, function(err, data) {
    if(err != null) {
      console.log(err);
    }
    console.log(JSON.stringify(data));
  });
  return {};
};

const lambdahandler2 = async (event) => {
  let tempEvent = JSON.parse(event.Records[0].Sns.Message);

  console.log(JSON.stringify(tempEvent));

  let message = tempEvent.source + " has Forecasted " + tempEvent.forecast +
     " at " + tempEvent.place + " for " + tempEvent.forecast_for;

  let evt = {
    type: tempEvent.type,
    source: tempEvent.source,
    timestamp: tempEvent.timestamp,
    formatting_timestamp: getUnixTime(),
    message: message
  }

  let messageString = JSON.stringify(evt);
  console.log(messageString);
  console.log(getQueueURL());

  var params = {
    MessageBody: messageString,
    QueueUrl: getQueueURL()
  };

  sqs.sendMessage(params, function(err, data) {
    if(err != null) {
      console.log(err);
    }
    console.log(JSON.stringify(data));
  });
  return {};
};

const lambdahandler3 = async (event) => {
  let tempEvent = JSON.parse(event.Records[0].Sns.Message);

  console.log(JSON.stringify(tempEvent));

  let message = tempEvent.source + " has Submitted a status change with the message "+ tempEvent.message;

  let evt = {
    type: tempEvent.type,
    source: tempEvent.source,
    timestamp: tempEvent.timestamp,
    formatting_timestamp: getUnixTime(),
    message: message
  }

  let messageString = JSON.stringify(evt);
  console.log(messageString);
  console.log(getQueueURL());

  var params = {
    MessageBody: messageString,
    QueueUrl: getQueueURL()
  };

  sqs.sendMessage(params, function(err, data) {
    if(err != null) {
      console.log(err);
    }
    console.log(JSON.stringify(data));
  });
  return {};
};

module.exports.handleErr = async (event) => {
  let tempEvent = event.Records[0].Sns.Message;
  console.log("Event with Payload has failed! "+ tempEvent);
  return {};
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

exports.formatTemperatureEvent = async (event, context, callback) => {
  return await handler(event, context, lambdahandler1, 'formattemperature');
} 

exports.formatForecastEvent = async (event, context, callback) => {
  return await handler(event, context, lambdahandler2, 'formatforecast');
} 

exports.formatStateChangeEvent = async (event, context, callback) => {
  return await handler(event, context, lambdahandler3, 'formatstatechanged');
} 
