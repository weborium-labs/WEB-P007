import type { Request, RequestHandler } from "express";

import { getAuth } from "../middlewares/authenticate.middleware.js";
import { getValidated } from "../middlewares/validate.middleware.js";
import * as batchService from "../services/batch.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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

const batchIdOf = (req: Request): string =>
    getValidated<BatchIdParams>(req, "params").batchId;

export const listBatches: RequestHandler = async (req, res) => {
    const query = getValidated<ListBatchesQuery>(req, "query");
    const data = await batchService.listBatches(actorOf(req), query);

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batches fetched successfully."));
};

export const getBatch: RequestHandler = async (req, res) => {
    const data = await batchService.getBatch(actorOf(req), batchIdOf(req));

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch fetched successfully."));
};

export const createBatch: RequestHandler = async (req, res) => {
    const input = getValidated<CreateBatchInput>(req, "body");
    const data = await batchService.createBatch(actorOf(req), input);

    return res
        .status(201)
        .json(new ApiResponse(201, data, "Batch created successfully."));
};

export const updateBatch: RequestHandler = async (req, res) => {
    const input = getValidated<UpdateBatchInput>(req, "body");
    const data = await batchService.updateBatch(
        actorOf(req),
        batchIdOf(req),
        input,
    );

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch updated successfully."));
};

export const setBatchHr: RequestHandler = async (req, res) => {
    const { hrIds } = getValidated<AssignBatchHrInput>(req, "body");
    const data = await batchService.setBatchHr(
        actorOf(req),
        batchIdOf(req),
        hrIds,
    );

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch HR owners updated successfully."));
};

export const archiveBatch: RequestHandler = async (req, res) => {
    const data = await batchService.archiveBatch(actorOf(req), batchIdOf(req));

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch archived successfully."));
};

export const restoreBatch: RequestHandler = async (req, res) => {
    const data = await batchService.restoreBatch(actorOf(req), batchIdOf(req));

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Batch restored successfully."));
};