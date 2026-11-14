import { Router } from "express";
import passport from "../config/passport.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    exchangeGoogleCode,
    forgotPassword,
    forwardProviderError,
    googleCallback,
    login,
    logout,
    oauthFailure,
    refreshAccessToken,
    resendOtp,
    resetPassword,
    signup,
    startGoogleAuth,
    verifyOtp,
    verifyResetOtp,
} from "../controllers/auth.controller.js";

import { signupSchema ,verifyOtpSchema ,resendOtpSchema,loginSchema,forgotPasswordSchema,verifyResetOtpSchema,resetPasswordSchema,exchangeCodeSchema } from "../validators/auth.validator.js";

const router: Router = Router();

// Google OAuth: state preparation, callback and single-use code exchange
router.get("/google", startGoogleAuth);
// `?error=` from the provider is handled before Passport so the signed
// `state` survives (a denied consent during linking must return to /profile).
router.get("/google/callback", forwardProviderError);
router.get(
    "/google/callback",
    passport.authenticate("google", {
        scope: ["openid", "profile", "email"],
        session: false,
        failureRedirect: "/api/v1/auth/failure",
    }),
    googleCallback,
);
router.get("/failure", oauthFailure);
router.post("/google/exchange", validate(exchangeCodeSchema), exchangeGoogleCode);

// Email / password auth
router.post("/signup", validate(signupSchema), signup);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), resendOtp);
router.post("/login", validate(loginSchema), login);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-reset-otp", validate(verifyResetOtpSchema), verifyResetOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Session lifecycle
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

export default router;
