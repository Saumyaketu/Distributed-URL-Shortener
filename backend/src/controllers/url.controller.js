import { validationResult } from "express-validator";
import { createShortUrl } from "../services/url.service.js";

export const createUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const url = await createShortUrl(req.body.originalUrl, req.user.userId);

    res.status(201).json({
      success: true,
      message: "URL created successfully",
      data: {
        id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: `${process.env.BASE_URL}/${url.shortCode}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
