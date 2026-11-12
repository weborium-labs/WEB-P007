import { Router, type Router as ExpressRouter } from "express";

import {
    archiveBatch,
    createBatch,
    getBatch,
    listBatches,
    restoreBatch,
    setBatchHr,
    updateBatch,
} from "../controllers/batch.controller.js";
import { Role } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    assignBatchHrSchema,
    batchIdParamSchema,
    createBatchSchema,
    listBatchesQuerySchema,
    updateBatchSchema,
} from "../validators/batch.validator.js";

const router: ExpressRouter = Router();

router.use(authenticate);

// Read: every role; row-level scope is applied in the service.
router.get("/", validate({ query: listBatchesQuerySchema }), listBatches);
router.get("/:batchId", validate({ params: batchIdParamSchema }), getBatch);

// Create / edit: Admin and HR (HR only for batches they own).
router.post(
    "/",
    authorize(Role.ADMIN, Role.HR),
    validate({ body: createBatchSchema }),
    createBatch,
);
router.patch(
    "/:batchId",
    authorize(Role.ADMIN, Role.HR),
    validate({ params: batchIdParamSchema, body: updateBatchSchema }),
    updateBatch,
);

// Admin only: HR ownership, archive (soft delete) and restore.
router.put(
    "/:batchId/hr",
    authorize(Role.ADMIN),
    validate({ params: batchIdParamSchema, body: assignBatchHrSchema }),
    setBatchHr,
);
router.delete(
    "/:batchId",
    authorize(Role.ADMIN),
    validate({ params: batchIdParamSchema }),
    archiveBatch,
);
router.post(
    "/:batchId/restore",
    authorize(Role.ADMIN),
    validate({ params: batchIdParamSchema }),
    restoreBatch,
);

export default router;