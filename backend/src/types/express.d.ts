import type { Role } from "../generated/prisma/client.js";

/** Identity resolved by `authenticate` from the database on every request. */
export interface AuthContext {
    userId: string;
    role: Role;
    batchId: string | null;
}

/** Output of the `validate` middleware (parsed and coerced by Zod). */
export interface ValidatedRequest {
    body?: unknown;
    query?: unknown;
    params?: unknown;
}

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
            validated?: ValidatedRequest;
        }
    }
}