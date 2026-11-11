import "dotenv/config";
import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = createServer(app);

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.info(`\n${signal} received. Shutting down gracefully...`);

  // Force close after 10s if connections refuse to drain
  const forceKillTimer = setTimeout(() => {
    console.error("Forcing shutdown: Active connections did not close in time.");
    process.exit(1);
  }, 10000);
  forceKillTimer.unref();

  server.close(async (error) => {
    if (error) {
      console.error("HTTP server closure error:", error);
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
      console.info("Prisma disconnected successfully.");
    } catch (disconnectError) {
      console.error("Prisma disconnect error:", disconnectError);
      process.exitCode = 1;
    }

    process.exit();
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

async function start() {
  try {
    // 1. Verify PostgreSQL connection before accepting traffic
    await prisma.$connect();
    console.info("Connected to PostgreSQL via Prisma.");

    // 2. Start HTTP Listener
    server.listen(env.PORT, () => {
      console.info(`WEB-P007 IMS API running at http://localhost:${env.PORT}`);
      console.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("Failed to boot server:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

void start();