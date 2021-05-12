'use strict'

const AJV = require('ajv')
const aws = require('aws-sdk') // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies
const { v4: uuidv4 } = require('uuid');

/**
 * Constants
 */
const constants = {
  // self
  MODULE: 'product-photos/4.report/report.js',
  METHOD_: '',
  METHOD_WRITE_TO_STREAM: 'writeToStream',
  METHOD_DELETE_ASSIGNMENT: 'deleteAssignment',
  // external
  RETAIL_STREAM_NAME: process.env.RETAIL_STREAM_NAME,
  RETAIL_STREAM_WRITER_ARN: process.env.RETAIL_STREAM_WRITER_ARN,
  TABLE_PHOTO_ASSIGNMENTS_NAME: process.env.TABLE_PHOTO_ASSIGNMENTS_NAME,
}

/**
 * AJV
 */
// TODO Get these from a better place later
const eventSchema = require('./retail-stream-schema-ingress.json')
const productImageSchema = require('./product-image-schema.json')

// TODO generalize this?  it is used by but not specific to this module
const makeSchemaId = schema => `${schema.self.vendor}/${schema.self.name}/${schema.self.version}`

const eventSchemaId = makeSchemaId(eventSchema)
const productImageSchemaId = makeSchemaId(productImageSchema)

const ajv = new AJV()
ajv.addSchema(eventSchema, eventSchemaId)
ajv.addSchema(productImageSchema, productImageSchemaId)

/**
 * AWS
 */
const dynamo = new aws.DynamoDB.DocumentClient()
const kinesis = new aws.Kinesis()

/**
 * Implementation
 */
const impl = {
  writeToStream: (lambdaEvent, callback) => {
    const origin = `product-photos/Photographer/${lambdaEvent.photographer.phone}/${lambdaEvent.photographer.id}`
    const productId = lambdaEvent.data.id.toString()
    const imageEvent = {
      schema: eventSchemaId,
      origin,
      timeOrigin: new Date().toISOString(),
      data: {
        schema: productImageSchemaId,
        id: productId,
        image: lambdaEvent.image,
      },
    }
    if (!ajv.validate(eventSchemaId, imageEvent)) {
      callback(`failure to validate to '${eventSchemaId}' with event:\n${imageEvent}`)
    } else if (!ajv.validate(productImageSchemaId, imageEvent.data)) {
      callback(`failure to validate to '${productImageSchemaId}' with event data:\n${imageEvent.data}`)
    } else {
      const params = {
        Data: JSON.stringify(imageEvent),
        PartitionKey: productId,
        StreamName: constants.RETAIL_STREAM_NAME,
      }
      kinesis.putRecord(params, callback)
    }
  },
  deleteAssignment: (event, callback) => {
    const params = {
      TableName: constants.TABLE_PHOTO_ASSIGNMENTS_NAME,
      Key: {
        id: event.data.id,
      },
      ConditionExpression: 'attribute_exists(#i)',
      ExpressionAttributeNames: {
        '#i': 'id', // status
      },
    }
    dynamo.delete(params, (err) => {
      if (err) {
        if (err.code && err.code === 'ConditionalCheckFailedException') { // consider the deletion of the record to indicate preemption by another component
          callback()
        } else {
          callback(err)
        }
      } else {
        callback()
      }
    })
  },
}

// monitoring function wrapping arbitrary payload code
function handlerWrapper(event, context, payload, callback) {
  const child_process = require("child_process");
  const v8 = require("v8");
  const { performance, PerformanceObserver, monitorEventLoopDelay } = require("perf_hooks");
  const [beforeBytesRx, beforePkgsRx, beforeBytesTx, beforePkgsTx] = child_process.execSync("cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'").toString().split(" ");
  const startUsage = process.cpuUsage();
  const beforeResourceUsage = process.resourceUsage();
  const wrapped = performance.timerify(payload);
  const h = monitorEventLoopDelay();
  h.enable();
  const durationStart = process.hrtime();

  return wrapped(event, context, function (err, result) {
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
    const [afterBytesRx, afterPkgsRx, afterBytesTx, afterPkgsTx] = child_process.execSync("cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'").toString().split(" ");
    const dynamodb = new aws.DynamoDB();
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
        TableName: "metrics.photo-report"
      }, function (err, data) {
        if (err) {
          console.log("Error", err);
        } else {
          console.log("Success", data.Item);
        }
      });
    callback(err, result);
  });
}

module.exports = {
  /**
   * Handle the report stage of the Acquire Photo Step Function
   *    1. Report the photo to the stream
   *    2. Delete the pending assignment
   * Example Event:
   * {
   *   schema: 'com.nordstrom/retail-stream/1-0-0',
   *   origin: 'hello-retail/product-producer-automation',
   *   timeOrigin: '2017-01-12T18:29:25.171Z',
   *   data: {
   *     schema: 'com.nordstrom/product/create/1-0-0',
   *     id: 4579874,
   *     brand: 'POLO RALPH LAUREN',
   *     name: 'Polo Ralph Lauren 3-Pack Socks',
   *     description: 'PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874',
   *     category: 'Socks for Men',
   *   },
   *   photographers: ['Erik'],
   *   photographer: {
   *     name: 'Erik',
   *     phone: '+<num>',
   *   },
   *   image: 'erik.hello-retail.biz/i/p/4579874'
   * }
   */
  handler: function(event, context, callback) {
    return handlerWrapper(event, context, (event, context, callback) => {
      console.log(JSON.stringify(event))
      impl.writeToStream(event, (wErr) => {
        if (wErr) {
          callback(`${constants.MODULE} ${constants.METHOD_WRITE_TO_STREAM} - ${wErr.stack}`)
        } else {
          impl.deleteAssignment(event, (dErr) => {
            if (dErr) {
              callback(`${constants.MODULE} ${constants.METHOD_DELETE_ASSIGNMENT} - ${dErr.stack}`)
            } else {
              const result = event
              result.outcome = 'photo taken'
              callback(null, result)
            }
          })
        }
      })
    }, callback);
  },
}
