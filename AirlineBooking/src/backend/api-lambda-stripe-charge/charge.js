const AWS = require('aws-sdk'),
  ssm = new AWS.SSM(),
  qs = require('querystring'),
  processResponse = require('./src/process-response'),
  createCharge = require('./src/create-charge'),
  STRIPE_SECRET_KEY_NAME = `/${process.env.SSM_PARAMETER_PATH}`,
  IS_CORS = true;
const { v4: uuidv4 } = require('uuid');
let stripeSecretKeys = "";
let _cold_start = true;

const lambdaHandler = (event, context) => {
  if (_cold_start) {
    _cold_start = false
    console.log("COLDSTART " + context.awsRequestId)
  }
  if (event.httpMethod === 'OPTIONS') {
    return Promise.resolve(processResponse(IS_CORS));
  }
  if (!event.body) {
    return Promise.resolve(processResponse(IS_CORS, 'invalid', 400));
  }

  const chargeRequest = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  if (!chargeRequest.amount || !chargeRequest.currency) {
    return Promise.resolve(processResponse(IS_CORS, 'invalid arguments, please provide amount and currency fields as mentioned in the app README', 400));
  }

  if (stripeSecretKeys === "") {
    return ssm.getParameter({ Name: STRIPE_SECRET_KEY_NAME, WithDecryption: true }).promise()
      .then(response => {
        stripeSecretKeys = response.Parameter.Value.split(',');
        let keyId = 0;
        if (typeof (chargeRequest.stripeKey) !== "undefined") {
          keyId = chargeRequest.stripeKey
        }
        const stripeSecretKeyValue = stripeSecretKeys[keyId]
        return createCharge(stripeSecretKeyValue, chargeRequest.stripeToken, chargeRequest.email, chargeRequest.amount, chargeRequest.currency, chargeRequest.description);
      }).then(createdCharge => processResponse(IS_CORS, { createdCharge }))
      .catch((err) => {
        console.log(err);
        return processResponse(IS_CORS, { err }, 500);
      });
  } else {
    let keyId = 0;
    if (typeof (chargeRequest.stripeKey) !== "undefined") {
      keyId = chargeRequest.stripeKey
    }
    const stripeSecretKeyValue = stripeSecretKeys[keyId]
    return createCharge(stripeSecretKeyValue, chargeRequest.stripeToken, chargeRequest.email, chargeRequest.amount, chargeRequest.currency, chargeRequest.description)
      .then(createdCharge => processResponse(IS_CORS, { createdCharge }))
      .catch((err) => {
        console.log(err);
        return processResponse(IS_CORS, { err }, 500);
      });
  }
};


// monitoring function wrapping arbitrary payload code
async function handler(event, context, payload) {
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

  const dynamodb = new AWS.DynamoDB({ region: 'us-west-2' });
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
      TableName: "long.ma.charge-stripe-metrics"
    }).promise();

  return ret;
};

exports.handler = async (event, context) => {
  return await handler(event, context, lambdaHandler);
}