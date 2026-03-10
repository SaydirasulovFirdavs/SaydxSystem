import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { setupLocalAuth, isLocalLogin } from "./localAuth";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

const mockUser = {
  claims: { sub: "local-user", email: "local@local", first_name: "Local", last_name: "User" },
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
};

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (DISABLE_AUTH) {
    app.use((req, _res, next) => {
      (req as any).session.passport = { user: mockUser };
      (req as any).user = mockUser;
      next();
    });
    app.get("/api/login", (_req, res) => res.redirect("/"));
    app.get("/api/callback", (_req, res) => res.redirect("/"));
    app.get("/api/logout", (_req, res) => res.redirect("/"));
    return { isAuthenticated, isAdmin };
  }

  // Login/parol orqali kirish (LOCAL_LOGIN=true)
  if (isLocalLogin()) {
    passport.serializeUser((user: Express.User, cb) => {
      const u = user as { id?: string };
      console.log("[localAuth] Serialize ID:", u?.id);
      cb(null, u?.id ?? null);
    });
    passport.deserializeUser(async (id: string, cb) => {
      try {
        console.log("[localAuth] Deserialize ID:", id);
        const user = await authStorage.getUser(id);
        console.log("[localAuth] Found User:", user?.username);
        cb(null, user ?? null);
      } catch (err) {
        console.error("[localAuth] Deserialize Error:", err);
        cb(err as Error, null);
      }
    });
    try {
      await setupLocalAuth(app);
    } catch (err) {
      console.warn("[localAuth] Baza tayyor emas (users jadvalida username/password_hash kerak). Iltimos: npm run db:push", (err as Error)?.message);
      app.post("/api/login", (_req, res) =>
        res.status(503).json({ message: "Baza yangilanmagan. Terminalda: npm run db:push ni ishlating." })
      );
      app.get("/api/logout", (_req, res) => res.redirect("/login"));
    }
    app.get("/api/login", (_req, res) => res.redirect("/login"));
    return { isAuthenticated, isAdmin };
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  // Consolidate serializers to avoid conflicts
  if (!isLocalLogin()) {
    passport.serializeUser((user: Express.User, cb) => {
      console.log("[replitAuth] Global Serialize:", user);
      cb(null, user);
    });
    passport.deserializeUser((user: Express.User, cb) => {
      console.log("[replitAuth] Global Deserialize:", user);
      cb(null, user);
    });
  }

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });

  return { isAuthenticated, isAdmin };
}

export const isAdmin: RequestHandler = (req, res, next) => {
  if (process.env.DISABLE_AUTH === "true") return next();
  const user = req.user as any;
  if (!req.isAuthenticated() || user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access only" });
  }
  next();
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (process.env.DISABLE_AUTH === "true") return next();
  const user = req.user as any;
  const isAuthed = (req as any).isAuthenticated();

  // Log to file for visibility as we can't see the console
  try {
    const fs = await import("fs");
    const path = await import("path");
    const logMsg = `[${new Date().toISOString()}] AUTH: Path=${req.path} isAuthenticated=${isAuthed} UserID=${user?.id} Role=${user?.role}\n`;
    fs.appendFileSync(path.join(process.cwd(), "auth_debug.log"), logMsg);
  } catch (err) { }

  // Local login: user.id bor bo'lsa yetarli
  if (isLocalLogin() && req.isAuthenticated() && user?.id) {
    // Agar role yo'q bo'lsa, DB dan qayta o'qiymiz (session stale bo'lishi mumkin)
    if (!user.role) {
      const dbUser = await authStorage.getUser(user.id);
      if (dbUser) {
        Object.assign(user, dbUser);
      }
    }
    return next();
  }

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Replit OIDC: expires_at tekshirish
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Replit OIDC user: role DB dan olinishi shart, chunki claimlarda bo'lmasligi mumkin
    if (!user.role && user.claims?.sub) {
      const dbUser = await authStorage.getUser(user.claims.sub);
      if (dbUser) {
        Object.assign(user, dbUser);
      }
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
