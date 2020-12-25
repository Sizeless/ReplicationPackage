import * as AWS from "aws-sdk";
import uuidv4 from 'uuid/v4';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import {
  DefaultDocumentClient,
  DocumentClientInterface,
  QueryInput,
  ItemList,
} from "./lib/document_client";

const tableName = process.env.TABLE_NAME;
const client = DefaultDocumentClient;

let _cold_start: boolean = true;
/**
 * Result interface
 */
interface Result {
  /**
   * points
   */
  points: number;

  /**
   * level
   */
  level: string;

  /**
   * remainingPoints needed to reach the next Tier
   */
  remainingPoints: number;
}

export enum LoyaltyTierPoints {
  gold = 100000,
  silver = 50000,
  bronze = 1,
}

export enum LoyaltyTier {
  bronze = "bronze",
  silver = "silver",
  gold = "gold",
}

/**
 * Calculate the level based on number of points
 *
 * @param points number
 * @returns LoyaltytierPoints
 */
export const level = (points: number): LoyaltyTier => {
  switch (true) {
    case points >= LoyaltyTierPoints.gold:
      return LoyaltyTier.gold;
    case points >= LoyaltyTierPoints.silver && points < LoyaltyTierPoints.gold:
      return LoyaltyTier.silver;
    default:
      return LoyaltyTier.bronze;
  }
};

export /**
 * Calculates how many points needed to progress to the next loyalty tier
 *
 * @param {number} points
 * @param {LoyaltyTier} level
 * @returns {number}
 */
const nextTier = (points: number, level: LoyaltyTier): number => {
  switch (level) {
    case LoyaltyTier.bronze:
      return LoyaltyTierPoints.silver - points;
    case LoyaltyTier.silver:
      return LoyaltyTierPoints.gold - points;
    default:
      return 0;
  }
};

/**
 * Returns the number of points for a customer
 *
 * @param {string} customerId
 * @param {DocumentClientInterface} client
 * @param {string} tableName
 * @returns {Promise<number>}
 */
export const points = async (
  customerId: string,
  client: DocumentClientInterface,
  tableName: string
): Promise<number> => {
  let items: ItemList = [];
  let params: QueryInput = {
    TableName: tableName,
    IndexName: "customer-flag",
    KeyConditionExpression: "customerId = :hkey and flag = :rkey",
    ExpressionAttributeValues: {
      ":hkey": customerId,
      ":rkey": "active",
    },
  };

  try {
    let data = await client.query(params).promise();
    if (data.Items) {
      items = data.Items;
    }
  } catch (error) {
    console.log(error);
    throw new Error(`Unable to query data`);
  }

  let points = 0;

  for (let v of items) {
    points = points + (v.points as number);
  }

  return points;
};

/**
 * Lambda function handler that takes a HTTP event from API GW
 *
 * @param {APIGatewayEvent} event
 * @returns {Promise<APIGatewayProxyResult>}
 */
export const lambdaHandler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  if (_cold_start) {
    _cold_start = false;
    console.log("COLDSTART " + context.awsRequestId);
  }

  if (!event.pathParameters || !event.pathParameters.customerId) {
    throw new Error("customerId not defined");
  }

  if (!tableName) {
    throw new Error("Table name is undefined");
  }

  const customerId = event.pathParameters.customerId;

  let p: number;
  try {
    p = await points(customerId, client, tableName);
  } catch (err) {
    console.log(err);
    throw err;
  }

  let currentTier = level(p);

  const result: Result = {
    points: p,
    level: currentTier,
    remainingPoints: nextTier(p, currentTier),
  };

  return {
    statusCode: 200,
    body: JSON.stringify(result as Object),
  };
};

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
        TableName: "long.ma.loyalty-get-metrics",
      })
      .promise();
  return ret;
}

export async function handler(event: any, context: any) {
  return await handlerWithMonitoring(event, context, lambdaHandler);
}
