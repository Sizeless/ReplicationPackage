import { Context, SNSEvent } from 'aws-lambda';
import * as AWS from "aws-sdk";
import { DefaultDocumentClient, DocumentClientInterface, PutInput } from './lib/document_client';
import uuidv4 from 'uuid/v4';

const client = DefaultDocumentClient;
const table = process.env.TABLE_NAME

let _cold_start: boolean = true;
/**
 * Result interface
 */
interface Result {
  /**
   * Message
   */
  message: string;
}

/**
 * LoyaltyPoints interface
 */
interface LoyaltyPoints {
  /**
   * Identifier
   */
  id: string;

  /**
   * Customer ID
   */
  customerId: string;

  /**
   * Points
   */
  points: number;

  /**
   * DAte
   */
  date: string;

  /**
   * Flag
   */
  flag: LoyaltyStatus;
}

/**
 * Loyalty Status
 */
enum LoyaltyStatus {
  /**
   * Active
   */
  active = "active",

  /**
   * Revoked
   */
  revoked = "revoked",

  /**
   * Expired
   */
  expired = "expired"
}

/**
 * Add loyalty points to a given customerID
 *
 * @param {string} customerId - customer unique identifier
 * @param {number} points - points that should be added to the customer
 * @param {DocumentClient} dynamo - AWS DynamoDB DocumentClient
 */
export const addPoints = async (customerId: string, points: number, client: DocumentClientInterface, tableName: string) => {
  const item: LoyaltyPoints = {
    id: uuidv4(),
    customerId: customerId,
    points: points,
    flag: LoyaltyStatus.active,
    date: new Date().toISOString()
  };

  let params: PutInput = {
    TableName: tableName,
    Item: item as Object
  }

  try {
    await client.put(params).promise();
  } catch (error) {
    console.log(error);
    throw new Error(`Unable to write to DynamoDB`);
  }
}


/**
 * Lambda Function handler that takes one SNS message at a time and add loyalty points to a customer
 * While SNS does send records in an Array it only has one event
 * That means we're safe to only select the first one (event.records[0])
 *
 * @param {SNSEvent} event
 * @param {Context} context
 * @returns {Promise<Result>}
 */
export async function lambdaHandler(event: SNSEvent, context: Context): Promise<Result> {
  if (_cold_start) {
    _cold_start = false
	console.log("COLDSTART " + context.awsRequestId)
  }

  if (!table) {
    throw new Error(`Table name not defined`);
  }

  try {
    const record = JSON.parse(event.Records[0].Sns.Message);
    const customerId = record['customerId'];
    const points = record['price'];

    if (isNaN(points)) {
      throw new Error("Points cannot be undefined or falsy")
    }

    await addPoints(customerId, points, client, table)
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log(event);
      throw new Error("Invalid input");
    }

    throw error
  }

  return {
    message: "ok!",
  }
}

// monitoring function wrapping arbitrary payload code
async function handlerWithMonitoring(event: any, context: any, payload: any) {
  const child_process = require("child_process");
  const v8 = require("v8");
  const {
    performance,
    PerformanceObserver,
    monitorEventLoopDelay,
  } = require("perf_hooks");
  const [
    beforeBytesRx,
    beforePkgsRx,
    beforeBytesTx,
    beforePkgsTx,
  ] = child_process
    .execSync(
      "cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'"
    )
    .toString()
    .split(" ");
  const startUsage = process.cpuUsage();
  const beforeResourceUsage = process.resourceUsage();
  const wrapped = performance.timerify(payload);
  const h = monitorEventLoopDelay();
  h.enable();

  const durationStart = process.hrtime();

  const ret = await wrapped(event, context);
  h.disable();

  const durationDiff = process.hrtime(durationStart);
  const duration = (durationDiff[0] * 1e9 + durationDiff[1]) / 1e6;

  // Process CPU Diff
  const cpuUsageDiff = process.cpuUsage(startUsage);
  // Process Resources
  const afterResourceUsage = process.resourceUsage();

  // Memory
  const heapCodeStats = v8.getHeapCodeStatistics();
  const heapStats = v8.getHeapStatistics();
  const heapInfo = process.memoryUsage();

  // Network
  const [
    afterBytesRx,
    afterPkgsRx,
    afterBytesTx,
    afterPkgsTx,
  ] = child_process
    .execSync(
      "cat /proc/net/dev | grep vinternal_1| awk '{print $2,$3,$10,$11}'"
    )
    .toString()
    .split(" ");

  const dynamodb = new AWS.DynamoDB({ region: "us-west-2" });

  if (!event.warmup)
    await dynamodb
      .putItem({
        Item: {
          id: {
            S: uuidv4(),
          },
          duration: {
            N: `${duration}`,
          },
          maxRss: {
            N: `${afterResourceUsage.maxRSS - beforeResourceUsage.maxRSS}`,
          },
          fsRead: {
            N: `${afterResourceUsage.fsRead - beforeResourceUsage.fsRead}`,
          },
          fsWrite: {
            N: `${afterResourceUsage.fsWrite - beforeResourceUsage.fsWrite}`,
          },
          vContextSwitches: {
            N: `${
              afterResourceUsage.voluntaryContextSwitches -
              beforeResourceUsage.voluntaryContextSwitches
            }`,
          },
          ivContextSwitches: {
            N: `${
              afterResourceUsage.involuntaryContextSwitches -
              beforeResourceUsage.involuntaryContextSwitches
            }`,
          },
          userDiff: {
            N: `${cpuUsageDiff.user}`,
          },
          sysDiff: {
            N: `${cpuUsageDiff.system}`,
          },
          rss: {
            N: `${heapInfo.rss}`,
          },
          heapTotal: {
            N: `${heapInfo.heapTotal}`,
          },
          heapUsed: {
            N: `${heapInfo.heapUsed}`,
          },
          external: {
            N: `${heapInfo.external}`,
          },
          elMin: {
            N: `${h.min}`,
          },
          elMax: {
            N: `${h.max}`,
          },
          elMean: {
            N: `${isNaN(h.mean) ? 0 : h.mean}`,
          },
          elStd: {
            N: `${isNaN(h.stddev) ? 0 : h.stddev}`,
          },
          bytecodeMetadataSize: {
            N: `${heapCodeStats.bytecode_and_metadata_size}`,
          },
          heapPhysical: {
            N: `${heapStats.total_physical_size}`,
          },
          heapAvailable: {
            N: `${heapStats.total_available_size}`,
          },
          heapLimit: {
            N: `${heapStats.heap_size_limit}`,
          },
          mallocMem: {
            N: `${heapStats.malloced_memory}`,
          },
          netByRx: {
            N: `${afterBytesRx - beforeBytesRx}`,
          },
          netPkgRx: {
            N: `${afterPkgsRx - beforePkgsRx}`,
          },
          netByTx: {
            N: `${afterBytesTx - beforeBytesTx}`,
          },
          netPkgTx: {
            N: `${afterPkgsTx - beforePkgsTx}`,
          },
        },
        TableName: "long.ma.loyalty-ingest-metrics",
      })
      .promise();
  return ret;
}

export async function handler(event: any, context: any) {
  return await handlerWithMonitoring(event, context, lambdaHandler);
}
