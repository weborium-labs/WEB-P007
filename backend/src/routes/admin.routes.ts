import { Router, type Router as ExpressRouter } from "express";

import {
    getDashboardStats,
    getUserStats,
    listUsers,
    updateUser,
} from "../controllers/admin.controller.js";
import { Role } from "../generated/prisma/client.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    listUsersQuerySchema,
    updateUserSchema,
    userIdParamSchema,
} from "../validators/admin.validator.js";

/**
 * Admin-only surface (`/api/v1/admin`).
 *
 * Every route requires authentication *and* the ADMIN role; individual
 * routes add their own Zod validation on top.
 */
const router: ExpressRouter = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get("/stats", getDashboardStats);

router.get("/users", validate({ query: listUsersQuerySchema }), listUsers);
router.get(
    "/users/:userId",
    validate({ params: userIdParamSchema }),
    getUserStats,
);
router.patch(
    "/users/:userId",
    validate(updateUserSchema),
    updateUser,
);

export default router;
