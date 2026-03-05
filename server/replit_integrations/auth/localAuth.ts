import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import type { Express } from "express";
import { authStorage } from "./storage";

const LOCAL_LOGIN = process.env.LOCAL_LOGIN === "true";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function setupLocalAuth(app: Express): Promise<void> {
  if (!LOCAL_LOGIN) return;

  // Birinchi admin foydalanuvchisini yaratish (mavjud bo'lmasa)
  const existing = await authStorage.getUserByUsername(ADMIN_USERNAME);
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await authStorage.createOrUpdateLocalUser(ADMIN_USERNAME, hash, "Admin", "User");
    console.log(`[localAuth] Default admin yaratildi: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  }

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await authStorage.getUserByUsername(username);
        if (!user || !user.passwordHash) return done(null, false, { message: "Login yoki parol noto'g'ri" });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return done(null, false, { message: "Login yoki parol noto'g'ri" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: { message?: string }) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!user) return res.status(401).json({ message: info?.message || "Login yoki parol noto'g'ri" });
      req.logIn(user, (loginErr: any) => {
        if (loginErr) return res.status(500).json({ message: loginErr.message });
        return res.json({ ok: true });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/login"));
  });
}

export function isLocalLogin(): boolean {
  return LOCAL_LOGIN;
}
