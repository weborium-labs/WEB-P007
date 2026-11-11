import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { requestContext } from "../utils/request-context.js";

export function requestContextMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const requestId = randomUUID();
    const startTime = Date.now();

    res.setHeader("X-Request-Id", requestId);

    requestContext.run({ requestId }, () => {
        console.info(
            JSON.stringify({
                event: "request_received",
                requestId,
                method: req.method,
                url: req.originalUrl,
                timestamp: new Date().toISOString(),
            }),
        );

        res.on("finish", () => {
            console.info(
                JSON.stringify({
                    event: "request_completed",
                    requestId,
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    durationMs: Date.now() - startTime,
                    timestamp: new Date().toISOString(),
                }),
            );
        });

        next();
    });
}