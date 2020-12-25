const util = require('util');
const AWS = require('aws-sdk');
const rekognition = new AWS.Rekognition();
const { v4: uuidv4 } = require('uuid');

const lambdaHandler = (event, context, callback) =>
{
    console.log("Reading input from event:\n", util.inspect(event, {depth: 5}));

    const srcBucket = event.s3Bucket;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(event.s3Key.replace(/\+/g, " "));

    var params = {
        Image: {
            S3Object: {
                Bucket: srcBucket,
                Name: srcKey
            }
        },
        Attributes: ['ALL']
    };

    rekognition.detectFaces(params).promise().then((data)=> {
        console.log("Detection result from rekognition:\n", util.inspect(data, {depth: 5}));
        if (data.FaceDetails.length != 1) {
            callback(new PhotoDoesNotMeetRequirementError("Detected " + data.FaceDetails.length + " faces in the photo."));
        }
        if (data.FaceDetails[0].Sunglasses.Value === true){
            callback(new PhotoDoesNotMeetRequirementError("Face is wearing sunglasses"));
        }
        var detectedFaceDetails = data.FaceDetails[0];

        // remove some fields not used in further processing to de-clutter the output.
        delete detectedFaceDetails['Landmarks'];

        callback(null, detectedFaceDetails);
    }).catch( err=> {
        console.log(err);
        if (err.code === "ImageTooLargeException"){
            callback(new PhotoDoesNotMeetRequirementError(err.message));
        }
        if (err.code === "InvalidImageFormatException"){
            callback(new PhotoDoesNotMeetRequirementError("Unsupported image file format. Only JPEG or PNG is supported"));
        }
        callback(err);
    });
};


function PhotoDoesNotMeetRequirementError(message) {
    this.name = "PhotoDoesNotMeetRequirementError";
    this.message = message;
}
PhotoDoesNotMeetRequirementError.prototype = new Error();

// monitoring function wrapping arbitrary payload code
function handler(event, context, payload, callback) {
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

  const ret = wrapped(event, context, callback);
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

  const dynamodb = new AWS.DynamoDB({ region: 'eu-west-1' });
  if (!event.warmup)
    dynamodb.putItem({
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
      TableName: "long.ma.cancel-booking-metrics"
    }, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data.Item);
  }
});

  return ret;
};

exports.handler = function(event, context, callback) {
  return handler(event, context, lambdaHandler, callback);
} 
