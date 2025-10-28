const express = require("express");
const session = require("express-session");
const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2").Strategy;
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// REQUIRED: Session configuration with TechoCloud standards
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours per TechoCloud standard
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// REQUIRED: TechoCloud OAuth Strategy
passport.use(
  "techocloud",
  new OAuth2Strategy(
    {
      authorizationURL: "https://identity.techocloud.com/oauth/authorize",
      tokenURL: "https://identity.techocloud.com/oauth/token",
      clientID: process.env.TECHOCLOUD_CLIENT_ID,
      clientSecret: process.env.TECHOCLOUD_CLIENT_SECRET,
      callbackURL:
        process.env.TECHOCLOUD_CALLBACK_URL ||
        "http://localhost:3000/auth/techocloud/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user profile from TechoCloud
        const userProfile = {
          id: profile.id,
          accessToken: accessToken,
          refreshToken: refreshToken,
          authTime: Date.now(), // Track authentication time
        };
        return done(null, userProfile);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // Check authentication time (24 hour limit per TechoCloud standard)
    const now = Date.now();
    const authTime = req.user.authTime || now;
    const hoursSinceAuth = (now - authTime) / (1000 * 60 * 60);

    if (hoursSinceAuth > 24) {
      req.logout((err) => {
        if (err) return next(err);
        return res.status(401).json({
          error: "Session expired",
          message: "Please log in again",
        });
      });
    } else {
      return next();
    }
  } else {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }
}

// Routes

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Hello World",
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? { id: req.user.id } : null,
  });
});

// Login route - redirects to TechoCloud
app.get(
  "/auth/login",
  passport.authenticate("techocloud", {
    scope: ["profile", "email"],
  }),
);

// OAuth callback route
app.get(
  "/auth/techocloud/callback",
  passport.authenticate("techocloud", {
    failureRedirect: "/auth/error",
  }),
  (req, res) => {
    // Successful authentication
    res.redirect("/dashboard");
  },
);

// Authentication error route
app.get("/auth/error", (req, res) => {
  res.status(401).json({
    error: "Authentication failed",
    message: "Unable to authenticate with TechoCloud",
  });
});

// Protected route - Dashboard
app.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.json({
    message: "Welcome to your dashboard",
    user: req.user,
    authTime: new Date(req.user.authTime).toISOString(),
  });
});

// Protected route - User info
app.get("/api/user", ensureAuthenticated, (req, res) => {
  const authTime = new Date(req.user.authTime);
  const now = Date.now();
  const hoursSinceAuth = (now - req.user.authTime) / (1000 * 60 * 60);

  res.json({
    user: {
      id: req.user.id,
      authenticatedAt: authTime.toISOString(),
      hoursSinceAuth: hoursSinceAuth.toFixed(2),
      sessionExpiresIn: (24 - hoursSinceAuth).toFixed(2) + " hours",
    },
  });
});

// Logout route
app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: "Logout failed",
        message: err.message,
      });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: "Session destruction failed",
          message: err.message,
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`TechoCloud OAuth configured`);
  console.log(`Login at: http://localhost:${port}/auth/login`);
});
