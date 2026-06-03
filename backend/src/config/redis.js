import { createClient } from "redis";

let redisClient = null;

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error(
      "Redis client is not initialized. Call connectRedis() before using cache service.",
    );
  }

  return redisClient;
};

export const connectRedis = async () => {
  try {
    const redisUri = process.env.REDIS_URI;

    if (!redisUri) {
      throw new Error("REDIS_URI is not configured in .env");
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
    });

    redisClient.on("connect", () => {
      console.log("Redis Connected");
    });

    redisClient.on("ready", () => {
      console.log("Redis Ready");
    });

    await redisClient.connect();
    console.log("Redis Cloud Connected Successfully");
  } catch (error) {
    console.error("Failed to connect to Redis Cloud:", error.message || error);
    process.exit(1);
  }
};
