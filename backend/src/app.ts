import express, { type Express, type ErrorRequestHandler } from "express";

import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/health.routes.js";

export const app: Express = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, e.g. server-to-server.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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
  const message =
    error instanceof Error ? error.message : "Internal server error";

  console.error("[API Error]", error);

  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production" ? "Internal server error" : message,
  });
};

app.use(errorHandler);
