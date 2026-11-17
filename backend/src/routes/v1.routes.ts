import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import batchRoutes from "./batch.routes.js"
import teamRoutes from "./team.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

const router: Router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/batch", batchRoutes);
router.use("/teams", teamRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);

export default router;
