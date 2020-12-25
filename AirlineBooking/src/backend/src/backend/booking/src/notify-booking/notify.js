const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });
const sns = new AWS.SNS({ region: "us-west-2" });
const { v4: uuidv4 } = require('uuid');

const bookingSNSTopic = process.env.BOOKING_TOPIC;

let coldStart = true;

async function notifyBooking(payload, bookingRef) {

  const bookingReference = bookingRef || "most recent booking";
  const successfulSubject = `Booking confirmation for ${bookingReference}`;
  const unsuccessfulSubject = `Unable to process booking for ${bookingReference}`;

  const subject = bookingReference ? successfulSubject : unsuccessfulSubject;
  const bookingStatus = bookingReference ? "confirmed" : "cancelled";

  try {
    const ret = await sns.publish({
      TopicArn: bookingSNSTopic,
      Message: JSON.stringify(payload),
      Subject: subject,
      MessageAttributes: {
        "Booking.Status": { "DataType": "String", "StringValue": bookingStatus }
      },
    }).promise();
    return { "notificationId": ret.MessageId };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function lambdaHandler(event, context) {
  if (coldStart) {
    coldStart = false
    console.log("COLDSTART", context.awsRequestId)
  }
  const customerId = event.customerId;
  const payment = event.payment;
  const price = payment.price;
  const bookingReference = event.bookingReference;

  if (!customerId && !price) {
    throw new Error("Invalid customer and price");
  }
  try {
    const payload = { "customerId": customerId, "price": price };
    const ret = await notifyBooking(payload, bookingReference);
    return ret.notificationId;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

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
      TableName: "long.ma.notify-booking-metrics"
    }).promise();

  return ret;
};

exports.handler = async (event, context) => {
  return await handler(event, context, lambdaHandler);
}
