import {
  popKeysFromRedis,
  replenishKeyPool,
  allocateRangeBlock,
  generateKeysForRange,
} from "./kgs.service.js";

const LOCAL_MIN_WATERMARK = 50;
const LOCAL_REFILL_BATCH = 200;
const EMERGENCY_BLOCK_SIZE = 50;

let buffer = [];
let refillPromise = null;

// Helper Functions
const refillLocalBuffer = async (count = LOCAL_REFILL_BATCH) => {
  try {
    let keys = await popKeysFromRedis(count);

    if (keys.length === 0) {
      const replenishResult = await replenishKeyPool({ batchSize: 5000 });
      if (replenishResult.replenished) {
        keys = await popKeysFromRedis(count);
      }
    } else if (keys.length < count) {
      replenishKeyPool({ batchSize: 5000 }).catch((e) =>
        console.error("[TokenBuffer] Async KGS replenishment failed:", e.message),
      );
    }

    if (keys.length > 0) {
      buffer.push(...keys);
    }
  } catch (error) {
    console.error("[TokenBuffer] Error refilling local buffer:", error.message);
  }
};

const triggerAsyncRefill = () => {
  if (refillPromise) return;
  refillPromise = refillLocalBuffer().finally(() => {
    refillPromise = null;
  });
};

const emergencyFallbackKey = async () => {
  try {
    const { startId, endId } = await allocateRangeBlock(EMERGENCY_BLOCK_SIZE);
    const keys = generateKeysForRange(startId, endId);

    const assignedKey = keys.shift();
    if (keys.length > 0) buffer.push(...keys);

    return assignedKey;
  } catch (error) {
    console.error(
      "[TokenBuffer] Emergency fallback generation failed:",
      error.message,
    );
    throw new Error("Unable to generate short code. System unavailable.");
  }
};

// Exported Public API
export const initTokenBuffer = async () => {
  console.log("[TokenBuffer] Initializing in-memory token buffer...");
  await refillLocalBuffer(LOCAL_REFILL_BATCH);
  console.log(
    `[TokenBuffer] In-memory buffer initialized with ${buffer.length} short codes.`,
  );
};

export const acquireKey = async () => {
  if (buffer.length > 0) {
    const key = buffer.shift();
    if (buffer.length <= LOCAL_MIN_WATERMARK) triggerAsyncRefill();
    return key;
  }

  if (!refillPromise) triggerAsyncRefill();
  await refillPromise;

  if (buffer.length > 0) return buffer.shift();

  console.warn(
    "[TokenBuffer] Redis pool empty or offline. Engaging emergency range fallback...",
  );
  return await emergencyFallbackKey();
};

export const getTokenBufferStats = () => ({
  bufferedCount: buffer.length,
  isRefilling: !!refillPromise,
  minWatermark: LOCAL_MIN_WATERMARK,
  refillBatch: LOCAL_REFILL_BATCH,
});
