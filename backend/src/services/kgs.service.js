import { getRedisClient, isRedisConnected } from "../config/redis.js";
import { encodeBase62 } from "../utils/base62.js";
import Cache from "../models/Cache.js";
import Counter from "../models/Counter.js";

const KEY_POOL_KEY = "key_pool:available";
const RANGE_COUNTER_KEY = "key_pool:range_counter";

export const DEFAULT_BATCH_SIZE = 5000;
export const DEFAULT_LOW_WATERMARK = 2000;

let isMigrated = false;

const ensureCounterInitialized = async () => {
  if (isMigrated) return;

  try {
    const existing = await Counter.findOne({ key: RANGE_COUNTER_KEY });
    if (!existing) {
      let startingValue = 0;

      // 1. Check legacy Cache model
      try {
        const legacyDoc = await Cache.findOne({ key: RANGE_COUNTER_KEY });
        if (legacyDoc && legacyDoc.value) {
          const parsed = parseInt(legacyDoc.value, 10);
          if (!isNaN(parsed) && parsed > startingValue) {
            startingValue = parsed;
          }
        }
      } catch (cacheErr) {
        console.warn("[KGS] Could not read legacy Cache during counter initialization:", cacheErr.message);
      }

      // 2. Check Redis counter if connected
      if (isRedisConnected()) {
        try {
          const client = getRedisClient();
          const redisVal = await client.get(RANGE_COUNTER_KEY);
          if (redisVal) {
            const parsed = parseInt(redisVal, 10);
            if (!isNaN(parsed) && parsed > startingValue) {
              startingValue = parsed;
            }
          }
        } catch (redisErr) {
          console.warn("[KGS] Could not read Redis counter during initialization:", redisErr.message);
        }
      }

      if (startingValue > 0) {
        await Counter.findOneAndUpdate(
          { key: RANGE_COUNTER_KEY },
          { $setOnInsert: { value: startingValue } },
          { upsert: true }
        );
        console.log(`[KGS] Migrated range counter to MongoDB Counter model at starting value: ${startingValue}`);
      }
    }
    isMigrated = true;
  } catch (err) {
    console.error("[KGS] Error checking counter initialization:", err.message);
  }
};


export const allocateRangeBlock = async (blockSize = DEFAULT_BATCH_SIZE) => {
  await ensureCounterInitialized();

  try {
    const doc = await Counter.findOneAndUpdate(
      { key: RANGE_COUNTER_KEY },
      { $inc: { value: blockSize } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    const endId = typeof doc.value === "number" ? doc.value : parseInt(doc.value, 10);
    const startId = endId - blockSize + 1;
    return { startId, endId };
  } catch (error) {
    console.error("MongoDB range allocation failed:", error.message);
    throw new Error("Failed to allocate ID range block");
  }
};


export const generateKeysForRange = (startId, endId) => {
  const keys = [];
  for (let id = startId; id <= endId; id++) {
    keys.push(encodeBase62(id));
  }
  return keys;
};


export const replenishKeyPool = async ({
  lowWatermark = DEFAULT_LOW_WATERMARK,
  batchSize = DEFAULT_BATCH_SIZE,
} = {}) => {
  if (!isRedisConnected()) {
    console.warn("Cannot replenish Redis key pool: Redis is not connected.");
    return { replenished: false, generatedCount: 0, currentPoolSize: 0 };
  }

  try {
    const client = getRedisClient();
    const currentPoolSize = await client.lLen(KEY_POOL_KEY);

    if (currentPoolSize >= lowWatermark) {
      return { replenished: false, generatedCount: 0, currentPoolSize };
    }

    console.log(
      `[KGS] Key pool below watermark (${currentPoolSize} < ${lowWatermark}). Replenishing ${batchSize} keys...`,
    );

    const { startId, endId } = await allocateRangeBlock(batchSize);
    const keys = generateKeysForRange(startId, endId);

    // Push keys in chunks to avoid blowing Redis argument buffer limits
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
      const chunk = keys.slice(i, i + CHUNK_SIZE);
      await client.rPush(KEY_POOL_KEY, chunk);
    }

    const newPoolSize = await client.lLen(KEY_POOL_KEY);
    console.log(`[KGS] Key pool replenished. New pool size: ${newPoolSize}`);

    return {
      replenished: true,
      generatedCount: keys.length,
      currentPoolSize: newPoolSize,
    };
  } catch (error) {
    console.error("[KGS] Error replenishing key pool:", error.message);
    return { replenished: false, generatedCount: 0, currentPoolSize: 0 };
  }
};


export const getKeyPoolLength = async () => {
  if (!isRedisConnected()) return 0;
  try {
    const client = getRedisClient();
    return await client.lLen(KEY_POOL_KEY);
  } catch (error) {
    console.error("[KGS] Failed to read key pool length:", error.message);
    return 0;
  }
};


export const popKeysFromRedis = async (count = 1) => {
  if (!isRedisConnected()) return [];

  try {
    const client = getRedisClient();
    if (count <= 1) {
      const key = await client.lPop(KEY_POOL_KEY);
      return key ? [key] : [];
    }

    let popped;
    if (typeof client.lPopCount === "function") {
      popped = await client.lPopCount(KEY_POOL_KEY, count);
    } else {
      popped = await client.lPop(KEY_POOL_KEY, count);
    }

    if (!popped) return [];
    return Array.isArray(popped) ? popped : [popped];
  } catch (error) {
    console.error("[KGS] Error popping keys from Redis pool:", error.message);
    return [];
  }
};
