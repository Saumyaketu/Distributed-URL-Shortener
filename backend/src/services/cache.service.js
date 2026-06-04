import { getRedisClient } from "../config/redis.js";

export const getCachedUrl = async (shortCode) => {
  const client = getRedisClient();
  const data = await client.get(`url:${shortCode}`);

  return data ? JSON.parse(data) : null;
};

export const cacheUrl = async (shortCode, urlData) => {
  const client = getRedisClient();

  await client.set(`url:${shortCode}`, JSON.stringify(urlData), {
    EX: 3600,
  });
};

export const deleteCachedUrl = async (shortCode) => {
  const client = getRedisClient();

  await client.del(`url:${shortCode}`);
};
