import { getRedisClient } from "../config/redis.js";

export const getCachedUrl = async (shortCode) => {
  const client = getRedisClient();
  const data = await client.get(`url:${shortCode}`);

  return data ? JSON.parse(data) : null;
};

export const cacheUrl = async (shortCode, urlData, ttlSeconds = null) => {
  const client = getRedisClient();
  const expirationTime = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : 3600;

  await client.set(`url:${shortCode}`, JSON.stringify(urlData), {
    EX: expirationTime,
  });
};

export const deleteCachedUrl = async (shortCode) => {
  const client = getRedisClient();

  await client.del(`url:${shortCode}`);
};

export const getNextUrlId = async () => {
  const client = getRedisClient();
  const exists = await client.exists("url_counter");
  if (!exists) {
    await client.set("url_counter", 1);
  }

  const nextId = await client.incr("url_counter");
  return nextId;
};
