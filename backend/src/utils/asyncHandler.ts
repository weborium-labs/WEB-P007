import type { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler =
    (requestHandler: RequestHandler): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(requestHandler(req, res, next)).catch(next);
    };