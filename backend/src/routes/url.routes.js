import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createUrlLimiter } from "../middleware/redisRateLimit.middleware.js";
import {
  createUrl,
  getUrls,
  deleteUrl,
  updateUrl,
} from "../controllers/url.controller.js";
import { createUrlValidator, updateUrlValidator } from "../validators/url.validator.js";

const router = Router();

router.post("/", authMiddleware, createUrlLimiter, createUrlValidator, createUrl);
router.get("/", authMiddleware, getUrls);

router.patch("/:id", authMiddleware, updateUrlValidator, updateUrl);
router.delete("/:id", authMiddleware, deleteUrl);

export default router;
