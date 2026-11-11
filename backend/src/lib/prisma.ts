import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import { env } from "../config/env.js";

// Aiven uses a private CA. Set DATABASE_CA to the CA PEM contents for full
// verification; otherwise TLS stays encrypted but the chain is not verified.
// sslmode is stripped from the URL so it can't override the ssl option below.
const url = new URL(env.DATABASE_URL);
url.searchParams.delete("sslmode");

const adapter = new PrismaPg({
  connectionString: url.toString(),
  ssl: process.env.DATABASE_CA
    ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

export const prisma = new PrismaClient({
  adapter,
});