// backend/config/passport.js

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const isProduction = process.env.NODE_ENV === "production";
const backendBaseUrl =
  process.env.BACKEND_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  (!isProduction ? `http://localhost:${process.env.PORT || 5000}` : "");

const normalizedBackendBaseUrl = backendBaseUrl.replace(/\/$/, "");
const isHttpsBackend = /^https:\/\//i.test(normalizedBackendBaseUrl);

const callbackUrl =
  process.env.GOOGLE_CALLBACK_URL ||
  `${normalizedBackendBaseUrl}/api/auth/google/callback`;

if (isProduction && !isHttpsBackend) {
  throw new Error("BACKEND_URL/RENDER_EXTERNAL_URL must use HTTPS in production.");
}

if (isProduction && /^http:\/\//i.test(callbackUrl)) {
  throw new Error("GOOGLE_CALLBACK_URL must use HTTPS in production.");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackUrl,
      proxy: true
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // 1️⃣ Check if user already exists by email
        let user = await User.findOne({ email });

        if (user) {
          // If existing local user, attach googleId
          if (!user.googleId) {
            user.googleId = profile.id;
            user.provider = "google";
            await user.save();
          }

          return done(null, user);
        }

        // 2️⃣ If user not found → create new Google user
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: email,
          provider: "google",
          role: "reader",
          status: "active",
        });

        return done(null, user);

      } catch (err) {
        console.error("Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

/* =====================
   SERIALIZE
===================== */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/* =====================
   DESERIALIZE
===================== */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;