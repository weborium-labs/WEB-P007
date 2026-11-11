import { getRequestId } from "./request-context.js";

interface ApiErrorResponse {
    success: boolean;
    statusCode: number;
    message: string;
    errors: unknown[];
    requestId?: string;
}

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly data: null = null;
    public readonly success: boolean = false;
    public readonly errors: unknown[];

    constructor(
        statusCode: number,
        message: string = "Something went wrong.",
        errors: unknown[] = [],
        stack: string = "",
    ) {
        super(message);

        this.name = "ApiError";
        this.statusCode = statusCode;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }

        Object.setPrototypeOf(this, new.target.prototype);
    }

    public toJSON(): ApiErrorResponse {
        const requestId = getRequestId();

        return {
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            errors: this.errors,
            ...(requestId ? { requestId } : {}),
        };
    }
}