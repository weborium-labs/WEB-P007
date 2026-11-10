import "dotenv/config";

import { createServer } from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const server = createServer(app);

server.listen(env.PORT, () => {
  console.info(`WEB-P007 IMS API running at http://localhost:${env.PORT}`);
  console.info(`Environment: ${env.NODE_ENV}`);
});

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.info(`${signal} received. Shutting down server...`);

  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown error:", error);
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
