import type { RequestHandler } from "express";

import { getValidated } from "../middlewares/validate.middleware.js";
import { getAuth } from "../middlewares/authenticate.middleware.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    assertGoogleLinkable,
    changePassword as changePasswordService,
    getProfile as getProfileService,
    setPassword as setPasswordService,
    updateProfile as updateProfileService,
} from "../services/user.service.js";
import {
    generateOAuthNonce,
    setNonceCookie,
    signLinkState,
} from "../services/oauth-state.service.js";
import type {
    ChangePasswordInput,
    SetPasswordInput,
    UpdateProfileInput,
} from "../validators/user.validator.js";

/**
 * Current-user profile endpoints. Thin controllers: validation lives in the
 * Zod schemas, persistence in `user.service`.
 */

export const getProfile: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const profile = await getProfileService(userId);

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Profile loaded successfully."));
});

export const updateProfile: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const input = getValidated<UpdateProfileInput>(req, "body");
    const profile = await updateProfileService(userId, input);

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Profile updated successfully."));
});

export const changePassword: RequestHandler = asyncHandler(
    async (req, res) => {
        const { userId } = getAuth(req);
        const input = getValidated<ChangePasswordInput>(req, "body");

        await changePasswordService(userId, input);

        return res.status(200).json(
            new ApiResponse(
                200,
                null,
                "Password changed successfully.",
            ),
        );
    },
);

/**
 * Sets the first local password on a Google-linked account (Feature: "set
 * email & password"). The updated profile comes back so the client can write
 * `providers.password = true` into its cache without a refetch.
 */
export const setPassword: RequestHandler = asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const input = getValidated<SetPasswordInput>(req, "body");

    const profile = await setPasswordService(userId, input);

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "Password set successfully."));
});

/**
 * Step 1 of account linking (Feature 3).
 *
 * Returns the signed `state` the browser must present to
 * `GET /auth/google?state=...`. The state is bound to the caller's userId
 * and to a single-use nonce stored in an HttpOnly cookie — the account email
 * travels inside the signed state (server-side), never in the URL.
 */
export const initGoogleLink: RequestHandler = asyncHandler(
    async (req, res) => {
        const { userId } = getAuth(req);

        await assertGoogleLinkable(userId);

        const nonce = generateOAuthNonce();
        setNonceCookie(res, nonce);

        return res.status(200).json(
            new ApiResponse(
                200,
                { state: signLinkState(userId, nonce) },
                "Continue with Google to link your account.",
            ),
        );
    },
);
