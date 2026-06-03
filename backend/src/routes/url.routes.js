import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createUrl } from "../controllers/url.controller.js";
import { createUrlValidator } from "../validators/url.validator.js";

const router = Router();

router.post("/", authMiddleware, createUrlValidator, createUrl);

export default router;
