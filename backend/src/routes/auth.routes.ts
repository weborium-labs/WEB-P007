import { RequestHandler, Router } from "express";
import passport from "../config/passport.js";

import {
    googleCallback,
    logout,
    refreshAccessToken,
} from "../controllers/auth.controller.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router: Router = Router();

const GOOGLE_SCOPES = ["openid", "profile", "email"] as const;
const VALID_ROLES = ["Intern", "Group_manager", "HR"];

// Step 1: validate the role, then pass it to Google via `state`
const startGoogleAuth: RequestHandler = (req, res, next) => {
    console.log("START:", req.originalUrl, "role =", req.query.role);
    const role = req.query.role;

    if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
        return res
            .status(400)
            .json(new ApiResponse(400, [], "User Role is required"));
    }

    return passport.authenticate("google", {
        scope: [...GOOGLE_SCOPES],
        session: false,
        state: role,
    })(req, res, next);
};

router.get("/google", startGoogleAuth);


router.get(
    "/google/callback",
    passport.authenticate("google", {
        scope: [...GOOGLE_SCOPES],
        session: false,
        failureRedirect: "/api/v1/auth/failure",
    }),
    googleCallback
);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logout);

export default router;