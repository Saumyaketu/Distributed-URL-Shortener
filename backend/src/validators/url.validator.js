import { body } from "express-validator";

export const createUrlValidator = [
  body("originalUrl")
    .notEmpty()
    .withMessage("URL is required")

    .isURL()
    .withMessage("Invalid URL"),
];
