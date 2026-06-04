import { getRedisClient } from "../config/redis.js";

export const createRateLimiter = ({ windowInSeconds, maxRequests, prefix }) => {
  return async (req, res, next) => {
    try {
      const client = getRedisClient();
      const ip = req.ip;
      const key = `rate_limit:${prefix}:${ip}`;
      const current = await client.get(key);

      if (!current) {
        await client.set(key, 1, {
          EX: windowInSeconds,
        });
        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", maxRequests - 1);

        return next();
      }

      const count = Number(current);

      if (count >= maxRequests) {
        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", 0);
        return res.status(429).json({
          success: false,
          message: "Too many requests.",
          remainingRequests: 0,
        });
      }

      await client.incr(key);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", maxRequests - (count + 1));
      
      next();
    } catch (error) {
      console.error("Rate limiter error:", error.message);

      next();
    }
  };
};

export const authLimiter = createRateLimiter({
  prefix: "auth",
  windowInSeconds: 15 * 60,
  maxRequests: 10,
});

export const createUrlLimiter = createRateLimiter({
  prefix: "url",
  windowInSeconds: 60 * 60,
  maxRequests: 100,
});
