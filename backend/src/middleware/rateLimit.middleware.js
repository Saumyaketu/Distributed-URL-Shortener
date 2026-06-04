import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createUrlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "URL creation limit exceeded.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
