
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { env } from "./env.js";

passport.use(
    "google",
    new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        (_accessToken, _refreshToken, profile, done) => {
            // Passport authenticates the Google identity.
            // Prisma user resolution and application JWT generation
            // happen in the authentication service/controller.
            done(null, profile);
        },
    ),
);

export default passport;