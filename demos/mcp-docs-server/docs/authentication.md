# Authentication Guide - TechoCloud OAuth Standard

## Overview

Our organization uses a **custom OAuth 2.0 implementation** with TechoCloud Identity Provider.
All applications MUST follow these exact patterns.

## REQUIRED Dependencies

```bash
npm install passport passport-oauth2 express-session helmet csurf
```

## Environment Variables (EXACT NAMES REQUIRED)

```bash
TECHOCLOUD_CLIENT_ID=your_client_id
TECHOCLOUD_CLIENT_SECRET=your_client_secret
TECHOCLOUD_CALLBACK_URL=http://localhost:3000/auth/techocloud/callback
SESSION_SECRET=your_session_secret_min_32_chars
```

## Complete Implementation Pattern

### 1. Session Configuration (REQUIRED)

```javascript
const session = require("express-session");
const helmet = require("helmet");

// REQUIRED: Helmet for security headers
app.use(helmet());

// REQUIRED: Session with specific settings
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);
```

### 2. Passport Configuration (COMPANY STANDARD)

```javascript
const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2");

// Initialize passport
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
      callbackURL: process.env.TECHOCLOUD_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Store tokens in session for audit
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;

        // REQUIRED: Log authentication for security audit
        console.log(
          `[AUTH] User authenticated: ${profile.id} at ${new Date().toISOString()}`,
        );

        return done(null, profile);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// REQUIRED: Serialize user (MUST include timestamp)
passport.serializeUser((user, done) => {
  done(null, {
    id: user.id,
    authenticatedAt: new Date().toISOString(),
  });
});

// REQUIRED: Deserialize user
passport.deserializeUser((user, done) => {
  done(null, user);
});
```

### 3. Authentication Routes (EXACT PATTERN)

```javascript
// REQUIRED: Login route
app.get(
  "/auth/login",
  passport.authenticate("techocloud", {
    prompt: "consent",
  }),
);

// REQUIRED: Callback route with error handling
app.get(
  "/auth/techocloud/callback",
  passport.authenticate("techocloud", {
    failureRedirect: "/auth/failure",
    successRedirect: "/dashboard",
  }),
);

// REQUIRED: Failure route with logging
app.get("/auth/failure", (req, res) => {
  console.log(`[AUTH] Authentication failed at ${new Date().toISOString()}`);
  res.status(401).json({
    error: "Authentication failed",
    message: "Unable to authenticate with TechoCloud",
  });
});

// REQUIRED: Logout with session destruction
app.get("/auth/logout", (req, res) => {
  const userId = req.user?.id;
  req.logout((err) => {
    if (err) {
      console.error(`[AUTH] Logout error for user ${userId}:`, err);
      return res.status(500).json({ error: "Logout failed" });
    }
    console.log(
      `[AUTH] User logged out: ${userId} at ${new Date().toISOString()}`,
    );
    req.session.destroy();
    res.redirect("/");
  });
});
```

### 4. Authentication Middleware (REQUIRED)

```javascript
// REQUIRED: Use this middleware on ALL protected routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // Check session age (24 hour maximum)
    const authTime = new Date(req.user.authenticatedAt);
    const now = new Date();
    const hoursSinceAuth = (now - authTime) / (1000 * 60 * 60);

    if (hoursSinceAuth > 24) {
      console.log(`[AUTH] Session expired for user ${req.user.id}`);
      return res.redirect("/auth/login");
    }

    return next();
  }
  res.redirect("/auth/login");
}

// Example protected route
app.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.json({
    message: "Protected dashboard",
    user: req.user,
  });
});
```

## MANDATORY Security Requirements

1. ✅ MUST use helmet middleware
2. ✅ MUST log all authentication events with timestamps
3. ✅ MUST use TechoCloud provider (not generic OAuth)
4. ✅ MUST implement session expiry check (24 hours)
5. ✅ MUST use exact environment variable names
6. ✅ MUST include error logging
7. ✅ MUST destroy session on logout

## Testing Checklist

- [ ] Login redirects to TechoCloud
- [ ] Callback handles success and failure
- [ ] Session persists across requests
- [ ] Session expires after 24 hours
- [ ] Logout destroys session
- [ ] All auth events logged
- [ ] Helmet headers present
