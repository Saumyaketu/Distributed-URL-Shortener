import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createUrlLimiter } from "../middleware/rateLimit.middleware.js";
import {
  createUrl,
  getUrls,
  deleteUrl,
} from "../controllers/url.controller.js";
import { createUrlValidator } from "../validators/url.validator.js";

const router = Router();

router.post("/", authMiddleware, createUrlLimiter, createUrlValidator, createUrl);
router.get("/", authMiddleware, getUrls);

router.delete("/:id", authMiddleware, deleteUrl);

export default router;
