import type { Request, RequestHandler } from "express";
import type { ZodType } from "zod";

import type { ValidatedRequest } from "../types/express.js";
import { ApiError } from "../utils/ApiError.js";

type Location = keyof ValidatedRequest;

interface ValidationSchemas {
    params?: ZodType;
    query?: ZodType;
    body?: ZodType;
}

const LOCATIONS: readonly Location[] = ["params", "query", "body"];

export const validate = (schemas: ValidationSchemas): RequestHandler => {
    return (req, _res, next) => {
        const issues: Array<{
            location: Location;
            path: string;
            message: string;
            code: string;
        }> = [];
        const validated: ValidatedRequest = {};

        for (const location of LOCATIONS) {
            const schema = schemas[location];
            if (!schema) continue;

            // A missing JSON body is `undefined` in Express 5; treat as {} so the
            // client sees "field is required" instead of "expected object".
            const input = location === "body" ? (req.body ?? {}) : req[location];
            const result = schema.safeParse(input);

            if (result.success) {
                validated[location] = result.data;
                continue;
            }

            for (const issue of result.error.issues) {
                issues.push({
                    location,
                    path: issue.path.map(String).join("."),
                    message: issue.message,
                    code: issue.code,
                });
            }
        }

        if (issues.length > 0) {
            return next(new ApiError(400, "Validation failed.", issues));
        }

        req.validated = validated;
        return next();
    };
};

/** Typed accessor for the output of `validate()`. */
export const getValidated = <T>(req: Request, location: Location): T => {
    const value = req.validated?.[location];

    if (value === undefined) {
        // Programmer error (route wired without validate()), surfaces as a 500.
        throw new Error(`validate() did not run for req.${location}.`);
    }

    return value as T;
};