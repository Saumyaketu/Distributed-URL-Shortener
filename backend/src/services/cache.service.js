import { getRedisClient, isRedisConnected } from "../config/redis.js";

export const getCachedUrl = async (shortCode) => {
  if (!isRedisConnected()) return null;

  try {
    const client = getRedisClient();
    const data = await client.get(`url:${shortCode}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Redis get failed for url:${shortCode}:`, error.message);
    return null;
  }
};

export const cacheUrl = async (shortCode, urlData, ttlSeconds = null) => {
  if (!isRedisConnected()) return;

  const expirationTime = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 3600;

  try {
    const client = getRedisClient();
    await client.set(`url:${shortCode}`, JSON.stringify(urlData), {
      EX: expirationTime,
    });
  } catch (error) {
    console.error(`Redis set failed for url:${shortCode}:`, error.message);
  }
};

export const deleteCachedUrl = async (shortCode) => {
  if (!isRedisConnected()) return;

  try {
    const client = getRedisClient();
    await client.del(`url:${shortCode}`);
  } catch (error) {
    console.error(`Redis delete failed for url:${shortCode}:`, error.message);
  }
};
