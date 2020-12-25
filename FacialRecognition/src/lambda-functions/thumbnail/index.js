// dependencies
const AWS = require('aws-sdk');
const gm = require('gm').subClass({imageMagick: true}); // Enable ImageMagick integration.
const util = require('util');
const Promise = require('bluebird');
Promise.promisifyAll(gm.prototype);
const { v4: uuidv4 } = require('uuid');

// constants
const MAX_WIDTH = process.env.MAX_WIDTH ? process.env.MAX_WIDTH : 250;
const MAX_HEIGHT = process.env.MAX_HEIGHT ? process.env.MAX_HEIGHT : 250;

const thumbnailBucket = process.env.THUMBNAIL_BUCKET;

// get reference to S3 client
const s3 = new AWS.S3();

const lambdaHandler = (event, context, callback) => {
    console.log("Reading input from event:\n", util.inspect(event, {depth: 5}));

    // get the object from S3 first
    const s3Bucket = event.s3Bucket;
    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(event.s3Key.replace(/\+/g, " "));
    const getObjectPromise = s3.getObject({
        Bucket: s3Bucket,
        Key: srcKey
    }).promise();

    // identify image metadata
    const identifyPromise = new Promise(resolve => {
        getObjectPromise.then(getObjectResponse => {
            console.log("success downloading from s3.");
            gm(getObjectResponse.Body).identifyAsync().then(data => {
                console.log("Identified metadata:\n", util.inspect(data, {depth: 5}));
                resolve(data)
            }).catch(err => {
                callback(err);
            });
        }).catch(err => {
            callback(err);
        });
    });


    // resize the image
    var resizePromise = new Promise((resolve) => {
        getObjectPromise.then((getObjectResponse) => {
            identifyPromise.then(identified => {
                const size = identified.size;
                const scalingFactor = Math.min(
                    MAX_WIDTH / size.width,
                    MAX_HEIGHT / size.height
                );
                const width = scalingFactor * size.width;
                const height = scalingFactor * size.height;
                gm(getObjectResponse.Body).resize(width, height).toBuffer(identified.format, (err, buffer) => {
                    if (err) {
                        console.error("failure resizing to " + width + " x " + height);
                        callback(err);
                    } else {
                        console.log("success resizing to " + width + " x " + height);
                        resolve(buffer);
                    }
                });
            }).catch(err => callback(err));

        }).catch(function (err) {
            callback(err);
        });
    })

    // upload the result image back to s3
    const destKey = "resized-" + srcKey;

    resizePromise.then(buffer => {
        identifyPromise.then(identified => {
            const s3PutParams = {
                Bucket: thumbnailBucket,
                Key: destKey,
                ContentType: "image/" + identified.format.toLowerCase()
            };

            s3PutParams.Body = buffer;
            s3.upload(s3PutParams).promise().then(data => {
                delete s3PutParams.Body;
                console.log("success uploading to s3:\n ", s3PutParams);
                var thumbnailImage = {};
                thumbnailImage.s3key = destKey;
                thumbnailImage.s3bucket = thumbnailBucket;
                callback(null, {'thumbnail': thumbnailImage});
            }).catch(function (err) {
                delete s3PutParams.Body;
                console.error("failure uploading to s3:\n ", s3PutParams);
                callback(err);
            })
        }).catch(err => {
            callback(err)
        });
    }).catch(function (err) {
        callback(err);
    })
}

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
      TableName: "ThumbnailMetrics"
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
