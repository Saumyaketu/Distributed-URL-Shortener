import { getRedisClient, isRedisConnected } from "../config/redis.js";
import Cache from "../models/Cache.js";

// Helper to get cache from Redis or MongoDB
const getRedisCacheValue = async (key) => {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Redis get failed for key ${key}. Falling back to MongoDB:`, error.message);
    // Fall back to MongoDB on Redis failure
    return getMongoDBCacheValue(key);
  }
};

const getMongoDBCacheValue = async (key) => {
  try {
    const cacheDoc = await Cache.findOne({ key });
    if (!cacheDoc) return null;

    // Check if expired
    if (cacheDoc.expiresAt && new Date() > cacheDoc.expiresAt) {
      await Cache.deleteOne({ key });
      return null;
    }

    return cacheDoc.value;
  } catch (error) {
    console.error(`Error getting MongoDB cache for key ${key}:`, error.message);
    return null;
  }
};

export const getCachedUrl = async (shortCode) => {
  if (isRedisConnected()) {
    return getRedisCacheValue(`url:${shortCode}`);
  } else {
    return getMongoDBCacheValue(`url:${shortCode}`);
  }
};

// Helper to set cache in Redis or MongoDB
const setRedisCacheValue = async (key, value, ttlSeconds = 3600) => {
  try {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error(`Redis set failed for key ${key}. Falling back to MongoDB:`, error.message);
    // Fall back to MongoDB on Redis failure
    await setMongoDBCacheValue(key, value, ttlSeconds);
  }
};

const setMongoDBCacheValue = async (key, value, ttlSeconds = 3600) => {
  try {
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    
    await Cache.findOneAndUpdate(
      { key },
      { value, expiresAt },
      { upsert: true, returnDocument: "after" }
    );
  } catch (error) {
    console.error(`Error setting MongoDB cache for key ${key}:`, error.message);
  }
};

export const cacheUrl = async (shortCode, urlData, ttlSeconds = null) => {
  const expirationTime = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 3600;

  if (isRedisConnected()) {
    // Try Redis, fall back to MongoDB if it fails
    await setRedisCacheValue(`url:${shortCode}`, urlData, expirationTime);
  } else {
    await setMongoDBCacheValue(`url:${shortCode}`, urlData, expirationTime);
  }
};

// Helper to delete cache from Redis or MongoDB
const deleteRedisCacheValue = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Redis delete failed for key ${key}. Falling back to MongoDB:`, error.message);
    // Fall back to MongoDB on Redis failure
    await deleteMongoDBCacheValue(key);
  }
};

const deleteMongoDBCacheValue = async (key) => {
  try {
    await Cache.deleteOne({ key });
  } catch (error) {
    console.error(`Error deleting MongoDB cache for key ${key}:`, error.message);
  }
};

export const deleteCachedUrl = async (shortCode) => {
  if (isRedisConnected()) {
    await deleteRedisCacheValue(`url:${shortCode}`);
  } else {
    await deleteMongoDBCacheValue(`url:${shortCode}`);
  }
};

export const getNextUrlId = async () => {
  if (isRedisConnected()) {
    try {
      const client = getRedisClient();
      const exists = await client.exists("url_counter");
      if (!exists) {
        await client.set("url_counter", 1);
      }
      const nextId = await client.incr("url_counter");
      return nextId;
    } catch (error) {
      console.error(`Redis counter failed. Falling back to MongoDB:`, error.message);
      // Fall back to MongoDB on Redis failure
      return getNextUrlIdFromMongoDB();
    }
  } else {
    return getNextUrlIdFromMongoDB();
  }
};

const getNextUrlIdFromMongoDB = async () => {
  try {
    const cacheDoc = await Cache.findOne({ key: "url_counter" });
    let currentId = cacheDoc ? parseInt(cacheDoc.value) : 0;
    currentId++;
    await Cache.findOneAndUpdate(
      { key: "url_counter" },
      { value: currentId.toString() },
      { upsert: true, returnDocument: "after" }
    );
    return currentId;
  } catch (error) {
    console.error(`Error getting next URL ID from MongoDB:`, error.message);
    throw new Error("Failed to generate URL ID");
  }
};
