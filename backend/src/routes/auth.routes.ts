import { RequestHandler, Router } from "express";
import passport from "../config/passport.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    forgotPassword,
    googleCallback,
    login,
    logout,
    refreshAccessToken,
    resendOtp,
    resetPassword,
    signup,
    verifyOtp,
    verifyResetOtp,
} from "../controllers/auth.controller.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { signupSchema ,verifyOtpSchema ,resendOtpSchema,loginSchema,forgotPasswordSchema,verifyResetOtpSchema,resetPasswordSchema } from "../validators/auth.validator.js";

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

router.post("/signup", validate({ body: signupSchema }), signup);
router.post("/verify-otp", validate({ body: verifyOtpSchema }), verifyOtp);
router.post("/resend-otp", validate({ body: resendOtpSchema }), resendOtp);
router.post("/login", validate({ body: loginSchema }), login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.post("/forgot-password", validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/verify-reset-otp", validate({ body: verifyResetOtpSchema }), verifyResetOtp);
router.post("/reset-password", validate({ body: resetPasswordSchema }), resetPassword);

export default router;