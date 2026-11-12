import type { Request, RequestHandler } from "express";

import { getAuth } from "../middlewares/authenticate.middleware.js";
import { getValidated } from "../middlewares/validate.middleware.js";
import * as batchService from "../services/batch.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type {
    AssignBatchHrInput,
    BatchIdParams,
    CreateBatchInput,
    ListBatchesQuery,
    UpdateBatchInput,
} from "../validators/batch.validator.js";

const actorOf = (req: Request): batchService.Actor => ({
    ...getAuth(req),
    ipAddress: req.ip,
});

const batchIdOf = (req: Request): string => {
    const { batchId } = getValidated<BatchIdParams>(req, "params");
    if (!batchId) {
        throw new ApiError(400, "Batch ID is required.");
    }
    return batchId;
};

export const listBatches: RequestHandler = asyncHandler(async (req, res) => {
    const query = getValidated<ListBatchesQuery>(req, "query");
    const data = await batchService.listBatches(actorOf(req), query);

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batches fetched successfully."));
});

export const getBatch: RequestHandler = asyncHandler(async (req, res) => {
    const data = await batchService.getBatch(actorOf(req), batchIdOf(req));

    if (!data) {
        throw new ApiError(404, "Batch not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch fetched successfully."));
});

export const createBatch: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<CreateBatchInput>(req, "body");
    const data = await batchService.createBatch(actorOf(req), input);

    if (!data) {
        throw new ApiError(500, "Failed to create batch.");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, data, "Batch created successfully."));
});

export const updateBatch: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<UpdateBatchInput>(req, "body");
    const data = await batchService.updateBatch(
        actorOf(req),
        batchIdOf(req),
        input,
    );

    if (!data) {
        throw new ApiError(404, "Batch not found or could not be updated.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch updated successfully."));
});

export const setBatchHr: RequestHandler = asyncHandler(async (req, res) => {
    const { hrIds } = getValidated<AssignBatchHrInput>(req, "body");
    const data = await batchService.setBatchHr(
        actorOf(req),
        batchIdOf(req),
        hrIds,
    );

    if (!data) {
        throw new ApiError(404, "Batch not found or HR assignment failed.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch HR owners updated successfully."));
});

export const archiveBatch: RequestHandler = asyncHandler(async (req, res) => {
    const data = await batchService.archiveBatch(actorOf(req), batchIdOf(req));

    if (!data) {
        throw new ApiError(404, "Batch not found or already archived.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch archived successfully."));
});

export const restoreBatch: RequestHandler = asyncHandler(async (req, res) => {
    const data = await batchService.restoreBatch(actorOf(req), batchIdOf(req));

    if (!data) {
        throw new ApiError(404, "Batch not found or already active.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch restored successfully."));
});