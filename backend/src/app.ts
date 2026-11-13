import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import v1Router from "./routes/v1.routes.js";
import { requestContextMiddleware } from "./middlewares/request-context.middleware.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";

export const app: Express = express();

app.use(requestContextMiddleware);

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
        if (
          url.hostname.endsWith(".localhost") ||
          url.hostname === "localhost"
        ) {
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
        // Invalid URL structure
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

app.use(passport.initialize());

// Trust edge reverse proxy (Nginx / Cloudflare) to accurately read host & IP
app.set("trust proxy", 1);

app.get("/", (_req, res) => {
  return res.status(200).json(
    new ApiResponse(200, [], 'IMS Weborium Labs running at port 5000')
  );
})

// API v1 root
app.get("/api/v1", (_req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        version: "1.0.0",
        docs: "/api/v1/docs",
        status: "active",
      },
      "Welcome to WEB-P007 IMS API v1",
    ),
  );
});

// API routes
app.use("/api/v1", v1Router);

// 404 handler
app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found."));
});

// Centralized global error handler
app.use(errorHandler);
