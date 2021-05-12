'use strict'

const aws = require('aws-sdk') // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies
const KH = require('kinesis-handler')
const { v4: uuidv4 } = require('uuid');

// TODO Get these from a better place later
const eventSchema = require('./retail-stream-schema-ingress.json')
const productCreateSchema = require('./product-create-schema.json')
const productImageSchema = require('./product-image-schema.json')

const constants = {
  // self
  MODULE: 'product-catalog/catalog.js',
  // methods
  METHOD_PUT_PRODUCT: 'putProduct',
  METHOD_PUT_IMAGE: 'putImage',
  // resources
  TABLE_PRODUCT_CATEGORY_NAME: process.env.TABLE_PRODUCT_CATEGORY_NAME,
  TABLE_PRODUCT_CATALOG_NAME: process.env.TABLE_PRODUCT_CATALOG_NAME,
}

const kh = new KH.KinesisHandler(eventSchema, constants.MODULE)

const dynamo = new aws.DynamoDB.DocumentClient()

const impl = {
  /**
   * Put the given product in to the dynamo catalog.  Example event:
   * {
   *   "schema": "com.nordstrom/retail-stream/1-0-0",
   *   "origin": "hello-retail/product-producer-automation",
   *   "timeOrigin": "2017-01-12T18:29:25.171Z",
   *   "data": {
   *     "schema": "com.nordstrom/product/create/1-0-0",
   *     "id": "4579874",
   *     "brand": "POLO RALPH LAUREN",
   *     "name": "Polo Ralph Lauren 3-Pack Socks",
   *     "description": "PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874",
   *     "category": "Socks for Men"
   *   }
   * }
   * @param event The product to put in the catalog.
   * @param complete The callback to inform of completion, with optional error parameter.
   */
  putProduct: (event, complete) => {
    const updated = Date.now()
    let priorErr
    const updateCallback = (err) => {
      if (priorErr === undefined) { // first update result
        if (err) {
          priorErr = err
        } else {
          priorErr = false
        }
      } else if (priorErr && err) { // second update result, if an error was previously received and we have a new one
        complete(`${constants.METHOD_PUT_PRODUCT} - errors updating DynamoDb: ${[priorErr, err]}`)
      } else if (priorErr || err) {
        complete(`${constants.METHOD_PUT_PRODUCT} - error updating DynamoDb: ${priorErr || err}`)
      } else { // second update result if error was not previously seen
        complete()
      }
    }
    const dbParamsCategory = {
      TableName: constants.TABLE_PRODUCT_CATEGORY_NAME,
      Key: {
        category: event.data.category,
      },
      UpdateExpression: [
        'set',
        '#c=if_not_exists(#c,:c),',
        '#cb=if_not_exists(#cb,:cb),',
        '#u=:u,',
        '#ub=:ub',
      ].join(' '),
      ExpressionAttributeNames: {
        '#c': 'created',
        '#cb': 'createdBy',
        '#u': 'updated',
        '#ub': 'updatedBy',
      },
      ExpressionAttributeValues: {
        ':c': updated,
        ':cb': event.origin,
        ':u': updated,
        ':ub': event.origin,
      },
      ReturnValues: 'NONE',
      ReturnConsumedCapacity: 'NONE',
      ReturnItemCollectionMetrics: 'NONE',
    }
    dynamo.update(dbParamsCategory, updateCallback)
    const dbParamsProduct = {
      TableName: constants.TABLE_PRODUCT_CATALOG_NAME,
      Key: {
        id: event.data.id,
      },
      UpdateExpression: [
        'set',
        '#c=if_not_exists(#c,:c),',
        '#cb=if_not_exists(#cb,:cb),',
        '#u=:u,',
        '#ub=:ub,',
        '#b=:b,',
        '#n=:n,',
        '#d=:d,',
        '#cat=:cat',
      ].join(' '),
      ExpressionAttributeNames: {
        '#c': 'created',
        '#cb': 'createdBy',
        '#u': 'updated',
        '#ub': 'updatedBy',
        '#b': 'brand',
        '#n': 'name',
        '#d': 'description',
        '#cat': 'category',
      },
      ExpressionAttributeValues: {
        ':c': updated,
        ':cb': event.origin,
        ':u': updated,
        ':ub': event.origin,
        ':b': event.data.brand,
        ':n': event.data.name,
        ':d': event.data.description,
        ':cat': event.data.category,
      },
      ReturnValues: 'NONE',
      ReturnConsumedCapacity: 'NONE',
      ReturnItemCollectionMetrics: 'NONE',
    }
    dynamo.update(dbParamsProduct, updateCallback)
  },
  /**
   * Put the given image in to the dynamo catalog.  Example event:
   * {
   *   "schema": "com.nordstrom/retail-stream/1-0-0",
   *   "origin": "hello-retail/product-producer-automation",
   *   "timeOrigin": "2017-01-12T18:29:25.171Z",
   *   "data": {
   *     "schema": "com.nordstrom/product/image/1-0-0",
   *     "id": "4579874",
   *     "image": "erik.hello-retail.biz/i/p/4579874"
   *   }
   * }
   * @param event The product to put in the catalog.
   * @param complete The callback to inform of completion, with optional error parameter.
   */
  putImage: (event, complete) => {
    const updated = Date.now()
    const dbParamsProduct = {
      TableName: constants.TABLE_PRODUCT_CATALOG_NAME,
      Key: {
        id: event.data.id,
      },
      UpdateExpression: [
        'set',
        '#c=if_not_exists(#c,:c),', // TODO this probably isn't necessary since a photo should never be requested until after product create...?
        '#cb=if_not_exists(#cb,:cb),',
        '#u=:u,',
        '#ub=:ub,',
        '#i=:i',
      ].join(' '),
      ExpressionAttributeNames: {
        '#c': 'created',
        '#cb': 'createdBy',
        '#u': 'updated',
        '#ub': 'updatedBy',
        '#i': 'image',
      },
      ExpressionAttributeValues: {
        ':c': updated,
        ':cb': event.origin,
        ':u': updated,
        ':ub': event.origin,
        ':i': event.data.image,
      },
      ReturnValues: 'NONE',
      ReturnConsumedCapacity: 'NONE',
      ReturnItemCollectionMetrics: 'NONE',
    }
    dynamo.update(dbParamsProduct, complete)
  },
}


// monitoring function wrapping arbitrary payload code
function handler(event, context, payload, callback) {
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
        TableName: "metrics.product-catalog-builder"
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

kh.registerSchemaMethodPair(productCreateSchema, impl.putProduct)
kh.registerSchemaMethodPair(productImageSchema, impl.putImage)

module.exports = {
  processKinesisEvent: function(event, context, callback) {
    return handler(event, context, kh.processKinesisEvent.bind(kh), callback);
  },
}

console.log(`${constants.MODULE} - CONST: ${JSON.stringify(constants, null, 2)}`)
console.log(`${constants.MODULE} - ENV:   ${JSON.stringify(process.env, null, 2)}`)
