import { body } from "express-validator";

export const createUrlValidator = [
  body("originalUrl")
    .notEmpty()
    .withMessage("URL is required")

    .isURL()
    .withMessage("Invalid URL"),
];

export const updateUrlValidator = [
  body("originalUrl")
    .notEmpty()
    .withMessage("Original URL is required")
    .isURL()
    .withMessage("Valid URL is required"),
];
