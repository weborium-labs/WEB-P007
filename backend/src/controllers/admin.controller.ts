import type { Request, RequestHandler } from "express";

import { getAuth } from "../middlewares/authenticate.middleware.js";
import { getValidated } from "../middlewares/validate.middleware.js";
import * as adminService from "../services/admin.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type {
    ListUsersQuery,
    UpdateUserInput,
    UserIdParams,
} from "../validators/admin.validator.js";

/**
 * Admin-only controllers. Thin layer: validation lives in the Zod schemas,
 * persistence and business rules in `admin.service`.
 */

const actorOf = (req: Request): adminService.Actor => ({
    ...getAuth(req),
    ipAddress: req.ip,
});

export const getDashboardStats: RequestHandler = asyncHandler(
    async (_req, res) => {
        const data = await adminService.getDashboardStats();

        return res
            .status(200)
            .json(new ApiResponse(200, data, "Dashboard stats fetched successfully."));
    },
);

export const listUsers: RequestHandler = asyncHandler(async (req, res) => {
    const query = getValidated<ListUsersQuery>(req, "query");
    const data = await adminService.listUsers(query);

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Users fetched successfully."));
});

export const getUserStats: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getValidated<UserIdParams>(req, "params");
    const data = await adminService.getUserStats(userId);

    return res
        .status(200)
        .json(new ApiResponse(200, data, "User stats fetched successfully."));
});

export const updateUser: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getValidated<UserIdParams>(req, "params");
    const input = getValidated<UpdateUserInput>(req, "body");
    const user = await adminService.updateUser(actorOf(req), userId, input);

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User updated successfully."));
});
