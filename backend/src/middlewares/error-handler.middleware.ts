import type { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
) => {
    if (error instanceof ApiError) {
        return res.status(error.statusCode).json(error);
    }

    console.error("[API Error]", error);

    const apiError = new ApiError(
        500,
        "Internal Server Error.",
    );

    return res.status(500).json(apiError);
};