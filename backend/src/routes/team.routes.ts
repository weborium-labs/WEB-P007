import { Router } from "express";
import {
    addInternsToTeam,
    assignGroupManagers,
    createTeam,
    deleteTeam,
    getAllTeams,
    getTeamById,
    removeInternsFromTeam,
    updateTeam,
} from "../controllers/team.controller.js";
import { authenticate } from "../middlewares/authenticate.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    assignGroupManagersSchema,
    createTeamSchema,
    listTeamsSchema,
    manageTeamInternsSchema,
    teamIdParamSchema,
    updateTeamSchema,
} from "../validators/team.validator.js";

const router: Router = Router();

// All team endpoints require a valid access token
router.use(authenticate);

// List & view teams
router.get("/", validate(listTeamsSchema), getAllTeams);
router.get("/:teamId", validate(teamIdParamSchema), getTeamById);

// Create team (HR, ADMIN, or GPM)
router.post(
    "/",
    authorize("HR", "GPM", "ADMIN"),
    validate(createTeamSchema),
    createTeam,
);

// Update team details (HR, ADMIN, or assigned GPM)
router.patch(
    "/:teamId",
    authorize("HR", "GPM", "ADMIN"),
    validate(updateTeamSchema),
    updateTeam,
);

// Assign 1 or 2 Group Managers to a team (HR or ADMIN only)
router.patch(
    "/:teamId/group-managers",
    authorize("HR", "ADMIN"),
    validate(assignGroupManagersSchema),
    assignGroupManagers,
);

// Add / remove interns on a team (HR, ADMIN, or assigned GPM)
router.post(
    "/:teamId/interns",
    authorize("HR", "GPM", "ADMIN"),
    validate(manageTeamInternsSchema),
    addInternsToTeam,
);

router.delete(
    "/:teamId/interns",
    authorize("HR", "GPM", "ADMIN"),
    validate(manageTeamInternsSchema),
    removeInternsFromTeam,
);

// Delete team (HR, ADMIN, or assigned GPM)
router.delete(
    "/:teamId",
    authorize("HR", "GPM", "ADMIN"),
    validate(teamIdParamSchema),
    deleteTeam,
);

export default router;