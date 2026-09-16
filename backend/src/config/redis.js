import { createClient } from "redis";

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

export const connectRedis = async () => {
  try {
    const redisUri = process.env.REDIS_URI;

    if (!redisUri) {
      console.warn("REDIS_URI is not configured. Cache and Bloom filter disabled.");
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
    });

    redisClient.on("connect", () => {
      console.log("Redis Connected");
    });

    redisClient.on("ready", () => {
      console.log("Redis Ready");
      isRedisAvailable = true;
    });

    await redisClient.connect();
    isRedisAvailable = true;
    console.log("Redis Cloud Connected Successfully");
  } catch (error) {
    console.error("Failed to connect to Redis Cloud:", error.message || error);
    isRedisAvailable = false;
  }
};
