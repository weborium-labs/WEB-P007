import { Router } from "express";

import { authenticate } from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    changePassword,
    getProfile,
    initGoogleLink,
    setPassword,
    updateProfile,
} from "../controllers/user.controller.js";
import {
    changePasswordSchema,
    setPasswordSchema,
    updateProfileSchema,
} from "../validators/user.validator.js";

const router: Router = Router();

// Every profile endpoint requires a valid access token and always operates
// on the *caller* (`/me`) — there is no way to read or edit someone else.
router.use(authenticate);

router.get("/me", getProfile);
router.patch("/me", validate(updateProfileSchema), updateProfile);
router.post("/me/password", validate(changePasswordSchema), changePassword);

// First-time credential setup for Google-linked accounts: confirms the
// account email and stores the new password hash. Separate from the change
// flow above, which always re-verifies the current password.
router.post(
    "/me/password/setup",
    validate(setPasswordSchema),
    setPassword,
);

// Account linking (Feature 3): issues the signed state for the Google
// redirect. No body — the caller identity comes from the access token.
router.post("/me/google/link/init", initGoogleLink);

export default router;
