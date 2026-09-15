import { createClient } from "redis";
import Cache from "../models/Cache.js";

let redisClient = null;
let isRedisAvailable = false;

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error(
      "Redis client is not initialized. Call connectRedis() before using cache service.",
    );
  }

  return redisClient;
};

export const isRedisConnected = () => {
  return isRedisAvailable;
};

// Sync cache from MongoDB to Redis on reconnection
const syncMongoDBCacheToRedis = async () => {
  try {
    console.log("Syncing MongoDB cache to Redis...");
    
    // Find all non-expired cache entries (excluding range counter)
    const cacheEntries = await Cache.find({
      key: { $ne: "key_pool:range_counter" },
      $or: [
        { expiresAt: null }, // No expiration
        { expiresAt: { $gt: new Date() } } // Not expired
      ]
    });

    let syncedCount = 0;
    const client = getRedisClient();

    for (const entry of cacheEntries) {
      try {
        // Calculate TTL if expiration exists
        let ttl = null;
        if (entry.expiresAt) {
          ttl = Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000);
          if (ttl <= 0) continue; // Skip if already expired
        }

        // Serialize: objects to JSON, primitives to raw string (prevents Redis INCR error on numeric counters)
        const serializedValue =
          typeof entry.value === "object" && entry.value !== null
            ? JSON.stringify(entry.value)
            : String(entry.value);

        // Sync to Redis
        if (ttl) {
          await client.set(entry.key, serializedValue, {
            EX: ttl,
          });
        } else {
          await client.set(entry.key, serializedValue);
        }
        
        syncedCount++;
      } catch (syncError) {
        console.error(`Failed to sync key ${entry.key}:`, syncError.message);
      }
    }

    console.log(`Synced ${syncedCount} cache entries from MongoDB to Redis`);
  } catch (error) {
    console.error("Failed to sync MongoDB cache to Redis:", error.message);
  }
};

export const connectRedis = async () => {
  try {
    const redisUri = process.env.REDIS_URI;

    if (!redisUri) {
      console.warn("REDIS_URI is not configured. Using MongoDB as fallback cache.");
      isRedisAvailable = false;
      return;
    }

    const url = new URL(redisUri);
    const tlsEnabled = url.protocol === "rediss:";

    const clientOptions = {
      url: redisUri,
    };

    if (tlsEnabled) {
      clientOptions.socket = {
        tls: true,
        rejectUnauthorized: false,
      };
    }

    redisClient = createClient(clientOptions);

    redisClient.on("error", (err) => {
      console.error("Redis Error:", err.message || err);
      isRedisAvailable = false;
      console.warn("Falling back to MongoDB for caching...");
    });

    redisClient.on("connect", () => {
      console.log("Redis Connected");
    });

    redisClient.on("ready", async () => {
      console.log("Redis Ready");
      isRedisAvailable = true;
      
      // Sync MongoDB cache to Redis on reconnection
      await syncMongoDBCacheToRedis();
    });

    await redisClient.connect();
    isRedisAvailable = true;
    console.log("Redis Cloud Connected Successfully");
  } catch (error) {
    console.error("Failed to connect to Redis Cloud:", error.message || error);
    console.warn("Using MongoDB as fallback cache.");
    isRedisAvailable = false;
  }
};
