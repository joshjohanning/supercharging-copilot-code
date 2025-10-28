const express = require("express");
const session = require("express-session");
const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2");
const app = express();
const port = 3000;

app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

/**
 * Serialize user for session
 * @param {Object} user - User object
 * @param {Function} done - Callback function
 */
passport.serializeUser((user, done) => {
  done(null, user);
});

/**
 * Deserialize user from session
 * @param {Object} user - User object
 * @param {Function} done - Callback function
 */
passport.deserializeUser((user, done) => {
  done(null, user);
});

/**
 * Configure OAuth 2.0 strategy
 * Replace with your OAuth provider's endpoints
 */
passport.use(
  new OAuth2Strategy(
    {
      authorizationURL:
        process.env.OAUTH_AUTHORIZATION_URL ||
        "https://provider.com/oauth2/authorize",
      tokenURL:
        process.env.OAUTH_TOKEN_URL || "https://provider.com/oauth2/token",
      clientID: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      callbackURL:
        process.env.OAUTH_CALLBACK_URL || "http://localhost:3000/auth/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Here you would typically:
        // 1. Fetch user profile using the access token
        // 2. Create or update user in your database
        // 3. Return the user object

        const user = {
          id: profile.id,
          accessToken,
          refreshToken,
          profile,
        };

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});

/**
 * Initiates OAuth authentication
 */
app.get("/auth/login", passport.authenticate("oauth2"));

/**
 * OAuth callback endpoint
 */
app.get(
  "/auth/callback",
  passport.authenticate("oauth2", {
    failureRedirect: "/auth/failure",
  }),
  (req, res) => {
    res.redirect("/auth/success");
  },
);

/**
 * Protected route example
 */
app.get("/auth/success", ensureAuthenticated, (req, res) => {
  res.json({
    message: "Authentication successful",
    user: req.user,
  });
});

/**
 * Authentication failure endpoint
 */
app.get("/auth/failure", (req, res) => {
  res.status(401).json({ error: "Authentication failed" });
});

/**
 * Logout endpoint
 */
app.get("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

/**
 * Get current user info
 */
app.get("/auth/user", ensureAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
