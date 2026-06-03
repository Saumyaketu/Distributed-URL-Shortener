import { validationResult } from "express-validator";
import { registerUser, loginUser } from "../services/auth.service.js";
import setTokenCookie from "../utils/setTokenCookie.js";
import User from "../models/User.js";

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const result = await registerUser(req.body);
    setTokenCookie(res, result.token);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const result = await loginUser(req.body);
    setTokenCookie(res, result.token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie("token");

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
