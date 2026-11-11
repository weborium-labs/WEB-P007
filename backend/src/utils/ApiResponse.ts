import { getRequestId } from "./request-context.js";

export class ApiResponse<T> {
    public readonly success: boolean;
    public readonly statusCode: number;
    public readonly data: T;
    public readonly message: string;
    public readonly requestId?: string;

    constructor(
        statusCode: number,
        data: T,
        message: string = "Success",
        requestId?: string,
    ) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;

        const currentRequestId = requestId ?? getRequestId();

        if (currentRequestId) {
            this.requestId = currentRequestId;
        }
    }

    public toJSON() {
        const requestId = this.requestId ?? getRequestId();

        return {
            success: this.success,
            statusCode: this.statusCode,
            data: this.data,
            message: this.message,
            ...(requestId ? { requestId } : {}),
        };
    }
}