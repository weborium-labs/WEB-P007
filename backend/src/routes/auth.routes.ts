import { Router } from "express";
import passport from "../config/passport.js";

import {
    googleCallback,
    logout,
    refreshAccessToken,
} from "../controllers/auth.controller.js";

const router: Router = Router();

const GOOGLE_SCOPES = [
    "openid",
    "profile",
    "email",
] as const;

router.get(
    "/google",
    passport.authenticate("google", {
        scope: [...GOOGLE_SCOPES],
        session: false,
    }),
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        scope: [...GOOGLE_SCOPES],
        session: false,
        failureRedirect: "/api/v1/auth/failure",
    }),
    googleCallback,
);

router.post("/refresh", refreshAccessToken);

router.post("/logout", logout);

export default router;