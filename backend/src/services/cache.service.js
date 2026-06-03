import { getRedisClient } from "../config/redis.js";

export const getCachedUrl = async (shortCode) => {
  const client = getRedisClient();

  return await client.get(`url:${shortCode}`);
};

export const cacheUrl = async (shortCode, originalUrl) => {
  const client = getRedisClient();
  
  await client.set(`url:${shortCode}`, originalUrl, {
    EX: 3600,
  });
};

export const deleteCachedUrl = async (shortCode) => {
  const client = getRedisClient();

  await client.del(`url:${shortCode}`);
};
