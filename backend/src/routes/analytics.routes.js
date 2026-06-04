import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { getAnalytics } from "../controllers/analytics.controller.js";

const router = Router();

router.get("/:urlId", authMiddleware, getAnalytics);

export default router;
