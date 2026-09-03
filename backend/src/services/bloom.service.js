import { getRedisClient, isRedisConnected } from "../config/redis.js";
import Url from "../models/Url.js";

const BLOOM_KEY = "bloom:urls";
const BIT_SIZE = 8 * 1024 * 1024; // (1 MB in Redis)
const NUM_HASHES = 5;
const HYDRATION_BATCH_SIZE = 2000;

// 32-bit FNV-1a Hash Function
const fnv1a = (str, seed = 0x811c9dc5) => {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};


// 32-bit DJB2 Hash Function
const djb2 = (str, seed = 5381) => {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
};

export const getHashOffsets = (key, bitSize = BIT_SIZE, numHashes = NUM_HASHES) => {
  const h1 = fnv1a(key);
  const h2 = djb2(key);
  const offsets = [];

  for (let i = 0; i < numHashes; i++) {
    const combined = (h1 + Math.imul(i, h2)) >>> 0;
    offsets.push(combined % bitSize);
  }

  return offsets;
};

export const addToBloomFilter = async (shortCode) => {
  if (!shortCode || !isRedisConnected()) return false;

  try {
    const client = getRedisClient();
    const offsets = getHashOffsets(shortCode);

    // Bundle all 5 SETBIT operations in a single pipelined roundtrip
    const multi = client.multi();
    offsets.forEach((offset) => multi.setBit(BLOOM_KEY, offset, 1));
    await multi.exec();

    return true;
  } catch (error) {
    console.error(`[BloomFilter] Redis add failed for "${shortCode}":`, error.message);
    return false;
  }
};

export const checkBloomFilter = async (shortCode) => {
  if (!shortCode) return false;

  // Fail-Open: If Redis is offline, allow request through to MongoDB to avoid false 404s
  if (!isRedisConnected()) return true; 

  try {
    const client = getRedisClient();
    const offsets = getHashOffsets(shortCode);

    // Bundle all 5 GETBIT operations in a single pipelined roundtrip
    const multi = client.multi();
    offsets.forEach((offset) => multi.getBit(BLOOM_KEY, offset));
    const results = await multi.exec();

    // If every bit is 1, the item might exist; if any bit is 0, it 100% does NOT exist
    return results.every((bit) => bit === 1);
  } catch (error) {
    console.error(
      `[BloomFilter] Redis check failed for "${shortCode}". Failing open:`,
      error.message,
    );
    // Fail-Open on error: let request proceed to cache/DB rather than giving false 404
    return true;
  }
};

export const hydrateBloomFilter = async () => {
  if (!isRedisConnected()) {
    console.warn("[BloomFilter] Redis not connected. Skipping Bloom hydration.");
    return { hydratedCount: 0 };
  }

  try {
    console.log("[BloomFilter] Streaming Bloom filter hydration from MongoDB cursor...");
    const client = getRedisClient();
    const cursor = Url.find({ isActive: true })
      .select("shortCode")
      .lean()
      .cursor({ batchSize: HYDRATION_BATCH_SIZE });

    let totalCount = 0;
    let batchOffsets = [];

    for await (const doc of cursor) {
      if (doc.shortCode) {
        const offsets = getHashOffsets(doc.shortCode);
        batchOffsets.push(...offsets);
        totalCount++;

        // Flush batch when chunk threshold is reached
        if (batchOffsets.length >= HYDRATION_BATCH_SIZE * NUM_HASHES) {
          const uniqueOffsets = Array.from(new Set(batchOffsets));
          const multi = client.multi();
          uniqueOffsets.forEach((offset) => multi.setBit(BLOOM_KEY, offset, 1));
          await multi.exec();
          batchOffsets = [];
        }
      }
    }

    // Flush remaining offsets
    if (batchOffsets.length > 0) {
      const uniqueOffsets = Array.from(new Set(batchOffsets));
      const multi = client.multi();
      uniqueOffsets.forEach((offset) => multi.setBit(BLOOM_KEY, offset, 1));
      await multi.exec();
    }

    console.log(
      `[BloomFilter] Successfully hydrated ${totalCount} active URLs into Bloom filter via streaming cursor.`,
    );
    return { hydratedCount: totalCount };
  } catch (error) {
    console.error("[BloomFilter] Hydration error:", error.message);
    return { hydratedCount: 0 };
  }
};

export const getBloomStats = (estimatedItems = 1000) => {
  const m = BIT_SIZE;
  const k = NUM_HASHES;
  const n = Math.max(estimatedItems, 1);

  // Theoretical False Positive Probability: p ≈ (1 - e^(-k * n / m))^k
  const fpp = Math.pow(1 - Math.exp((-k * n) / m), k);

  return {
    bitSize: m,
    memorySizeBytes: Math.ceil(m / 8),
    numHashFunctions: k,
    estimatedItemCount: n,
    theoreticalFalsePositiveRate: parseFloat((fpp * 100).toFixed(4)) + "%",
  };
};
