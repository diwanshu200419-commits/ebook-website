// backend/config/passport.js

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");
const {
  getBackendBaseUrl,
  getGoogleCallbackUrl,
  isProduction
} = require("../utils/urlConfig");

const backendBaseUrl = getBackendBaseUrl();
const callbackUrl = getGoogleCallbackUrl();

if (isProduction() && !/^https:\/\//i.test(backendBaseUrl)) {
  throw new Error("BACKEND_URL/RENDER_EXTERNAL_URL must use HTTPS in production.");
}

if (isProduction() && /^http:\/\//i.test(callbackUrl)) {
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
        const email = String(profile.emails?.[0]?.value || "").toLowerCase().trim();
        if (!email) {
          return done(new Error("Google account did not provide an email address"), null);
        }

        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }

          return done(null, user);
        }

        user = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
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
