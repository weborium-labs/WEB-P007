import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(
    _req: Request,
    _res: Response,
    next: NextFunction,
): void {
    next(new ApiError(404, "Route not found."));
}