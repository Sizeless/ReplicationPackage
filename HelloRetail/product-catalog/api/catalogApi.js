'use strict'

const AJV = require('ajv')
const aws = require('aws-sdk') // eslint-disable-line import/no-unresolved, import/no-extraneous-dependencies
const { v4: uuidv4 } = require('uuid');

// TODO Get these from a better place later
const categoryRequestSchema = require('./categories-request-schema.json')
const categoryItemsSchema = require('./category-items-schema.json')
const productsRequestSchema = require('./products-request-schema.json')
const productItemsSchema = require('./product-items-schema.json')

// TODO generalize this?  it is used by but not specific to this module
const makeSchemaId = schema => `${schema.self.vendor}/${schema.self.name}/${schema.self.version}`

const categoryRequestSchemaId = makeSchemaId(categoryRequestSchema)
const categoryItemsSchemaId = makeSchemaId(categoryItemsSchema)
const productsRequestSchemaId = makeSchemaId(productsRequestSchema)
const productItemsSchemaId = makeSchemaId(productItemsSchema)

const ajv = new AJV()
ajv.addSchema(categoryRequestSchema, categoryRequestSchemaId)
ajv.addSchema(categoryItemsSchema, categoryItemsSchemaId)
ajv.addSchema(productsRequestSchema, productsRequestSchemaId)
ajv.addSchema(productItemsSchema, productItemsSchemaId)

const dynamo = new aws.DynamoDB.DocumentClient()

const constants = {
  // self
  MODULE: 'product-catalog/catalogApi.js',
  // methods
  METHOD_CATEGORIES: 'categories',
  METHOD_PRODUCTS: 'products',
  // resources
  TABLE_PRODUCT_CATEGORY_NAME: process.env.TABLE_PRODUCT_CATEGORY_NAME,
  TABLE_PRODUCT_CATALOG_NAME: process.env.TABLE_PRODUCT_CATALOG_NAME,
  //
  INVALID_REQUEST: 'Invalid Request',
  INTEGRATION_ERROR: 'Integration Error',
  HASHES: '##########################################################################################',
  SECURITY_RISK: '!!!SECURITY RISK!!!',
  DATA_CORRUPTION: 'DATA CORRUPTION',
}

const impl = {
  response: (statusCode, body) => ({
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
    },
    body,
  }),
  clientError: (schemaId, ajvErrors, event) => impl.response(
    400,
    `${constants.METHOD_CATEGORIES} ${constants.INVALID_REQUEST} could not validate request to '${schemaId}' schema. Errors: '${ajvErrors}' found in event: '${JSON.stringify(event)}'` // eslint-disable-line comma-dangle
  ),
  dynamoError: (err) => {
    console.log(err)
    return impl.response(500, `${constants.METHOD_CATEGORIES} - ${constants.INTEGRATION_ERROR}`)
  },
  securityRisk: (schemaId, ajvErrors, items) => {
    console.log(constants.HASHES)
    console.log(constants.SECURITY_RISK)
    console.log(`${constants.METHOD_CATEGORIES} ${constants.DATA_CORRUPTION} could not validate data to '${schemaId}' schema. Errors: ${ajvErrors}`)
    console.log(`${constants.METHOD_CATEGORIES} ${constants.DATA_CORRUPTION} bad data: ${JSON.stringify(items)}`)
    console.log(constants.HASHES)
    return impl.response(500, `${constants.METHOD_CATEGORIES} - ${constants.INTEGRATION_ERROR}`)
  },
  success: items => impl.response(200, JSON.stringify(items)),
}
const api = {
  // TODO deal with pagination
  categories: (event, context, callback) => {
    if (!ajv.validate(categoryRequestSchemaId, event)) { // bad request
      callback(null, impl.clientError(categoryRequestSchemaId, ajv.errorsText()), event)
    } else {
      const params = {
        TableName: constants.TABLE_PRODUCT_CATEGORY_NAME,
        AttributesToGet: ['category'],
      }
      dynamo.scan(params, (err, data) => {
        if (err) { // error from dynamo
          callback(null, impl.dynamoError(err))
        } else if (!ajv.validate(categoryItemsSchemaId, data.Items)) { // bad data in dynamo
          callback(null, impl.securityRisk(categoryItemsSchemaId, ajv.errorsText()), data.Items) // careful if the data is sensitive
        } else { // valid
          callback(null, impl.success(data.Items))
        }
      })
    }
  },
  // TODO this is only filter/query impl, also handle single item request
  // TODO deal with pagination
  products: (event, context, callback) => {
    if (!ajv.validate(productsRequestSchemaId, event)) { // bad request
      callback(null, impl.clientError(productsRequestSchemaId, ajv.errorsText(), event))
    } else {
      let params
      if (event.queryStringParameters.id) {
        params = {
          TableName: constants.TABLE_PRODUCT_CATALOG_NAME,
          ProjectionExpression: '#i, #b, #n, #d',
          KeyConditionExpression: '#i = :i',
          ExpressionAttributeNames: {
            '#i': 'id',
            '#b': 'brand',
            '#n': 'name',
            '#d': 'description',
          },
          ExpressionAttributeValues: {
            ':i': event.queryStringParameters.id,
          },
          Limit: 1,
        }
      } else {
        params = {
          TableName: constants.TABLE_PRODUCT_CATALOG_NAME,
          IndexName: 'Category',
          ProjectionExpression: '#i, #b, #n, #d',
          KeyConditionExpression: '#c = :c',
          ExpressionAttributeNames: {
            '#i': 'id',
            '#c': 'category',
            '#b': 'brand',
            '#n': 'name',
            '#d': 'description',
          },
          ExpressionAttributeValues: {
            ':c': event.queryStringParameters.category,
          },
        }
      }
      dynamo.query(params, (err, data) => {
        if (err) { // error from dynamo
          callback(null, impl.dynamoError(err))
        } else if (!ajv.validate(productItemsSchemaId, data.Items)) { // bad data in dynamo
          callback(null, impl.securityRisk(productItemsSchemaId, ajv.errorsText()), data.Items) // careful if the data is sensitive
        } else { // valid
          callback(null, impl.success(data.Items))
        }
      })
    }
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
        TableName: "metrics.product-catalog-api"
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
  categories: function(event, context, callback) {
    return handler(event, context, api.categories, callback);
  },
  products: function(event, context, callback) {
    return handler(event, context, api.products, callback);
  },
}
