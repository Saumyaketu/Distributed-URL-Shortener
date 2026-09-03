import { getRedisClient, isRedisConnected } from "../config/redis.js";
import { encodeBase62 } from "../utils/base62.js";
import Cache from "../models/Cache.js";

const KEY_POOL_KEY = "key_pool:available";
const RANGE_COUNTER_KEY = "key_pool:range_counter";

export const DEFAULT_BATCH_SIZE = 5000;
export const DEFAULT_LOW_WATERMARK = 2000;

export const allocateRangeBlock = async (blockSize = DEFAULT_BATCH_SIZE) => {
  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      const endId = await client.incrBy(RANGE_COUNTER_KEY, blockSize);
      const startId = endId - blockSize + 1;
      return { startId, endId };
    } catch (error) {
      console.error(
        "Failed to allocate range block via Redis. Falling back to MongoDB:",
        error.message,
      );
      return allocateRangeBlockFromMongoDB(blockSize);
    }
  } else {
    return allocateRangeBlockFromMongoDB(blockSize);
  }
};

const allocateRangeBlockFromMongoDB = async (blockSize) => {
  try {
    const doc = await Cache.findOneAndUpdate(
      { key: RANGE_COUNTER_KEY },
      {
        $inc: { value: blockSize },
        $setOnInsert: { expiresAt: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
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
