import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/health.routes.js";
import { env } from "./config/env.js";

export const app: Express = express();

// Base domain configuration from env
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "weborium.co.in";

const explicitOrigins = (
  process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security headers
app.use(helmet());

// Dynamic CORS for subdomains & localhost
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      // Check explicit local/dev origins
      if (explicitOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const url = new URL(origin);
        // Allow any *.localhost for local multi-tenant testing
        if (url.hostname.endsWith(".localhost") || url.hostname === "localhost") {
          return callback(null, true);
        }
        // Allow root domain and any *.weborium.co.in
        if (
          url.hostname === ROOT_DOMAIN ||
          url.hostname.endsWith(`.${ROOT_DOMAIN}`)
        ) {
          return callback(null, true);
        }
      } catch {
        // invalid URL structure
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Body and Cookie parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Trust edge reverse proxy (Nginx / Cloudflare) to accurately read host & IP
app.set("trust proxy", 1);

// API routes
app.use("/api/v1/health", healthRoutes);

// 404 handler
app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Central error handler
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const isProd = env.NODE_ENV === "production";
  const statusCode = error.status || error.statusCode || 500;
  const message = error instanceof Error ? error.message : "Internal server error";

  console.error("[API Error]", error);

  return res.status(statusCode).json({
    success: false,
    message: isProd && statusCode === 500 ? "Internal server error" : message,
  });
};

app.use(errorHandler);