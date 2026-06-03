import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import urlRoutes from "./routes/url.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { redirectUrl } from "./controllers/url.controller.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(helmet());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Distributed URL Shortener API",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);

app.get("/:shortCode", redirectUrl);

app.use(errorHandler);

export default app;
