import { Router } from "express";
import { register, login, getMe, logout } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  registerValidator,
  loginValidator,
} from "../validators/auth.validator.js";

const router = Router();

router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post("/logout", authMiddleware, logout);

router.get("/me", authMiddleware, getMe);

export default router;
