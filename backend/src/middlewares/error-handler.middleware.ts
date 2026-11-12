import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { Prisma } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";

const toApiError = (error: unknown): ApiError | null => {
    if (error instanceof ApiError) return error;

    // Safety net: a schema parsed outside the validate() middleware.
    if (error instanceof ZodError) {
        return new ApiError(
            400,
            "Validation failed.",
            error.issues.map((issue) => ({
                path: issue.path.map(String).join("."),
                message: issue.message,
                code: issue.code,
            })),
        );
    }

    // Prisma: surface constraint violations as 4xx, never leak internals.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002": // unique constraint
                return new ApiError(409, "Resource already exists.");
            case "P2003": // foreign key constraint
                return new ApiError(409, "Related resource constraint failed.");
            case "P2025": // record not found
                return new ApiError(404, "Resource not found.");
        }
    }

    // body-parser / http-errors: malformed JSON, payload too large, etc.
    const httpError = error as {
        status?: unknown;
        expose?: unknown;
        type?: unknown;
        message?: unknown;
    } | null;

    if (
        typeof httpError === "object" &&
        httpError !== null &&
        httpError.expose === true &&
        typeof httpError.status === "number" &&
        typeof httpError.message === "string"
    ) {
        const { status, type, message } = httpError;

        if (status >= 400 && status < 500) {
            return new ApiError(
                status,
                type === "entity.parse.failed" ? "Malformed JSON body." : message,
            );
        }
    }

    return null;
};

export const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
) => {
    const apiError = toApiError(error);

    if (apiError) {
        return res.status(apiError.statusCode).json(apiError);
    }

    console.error("[API Error]", error);

    return res.status(500).json(new ApiError(500, "Internal Server Error."));
};