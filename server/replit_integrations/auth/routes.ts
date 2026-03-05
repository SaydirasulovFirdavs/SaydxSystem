import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { isLocalLogin } from "./localAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      if (process.env.DISABLE_AUTH === "true") {
        return res.json({
          id: "local-user",
          email: "local@local",
          firstName: "Local",
          lastName: "User",
          profileImageUrl: null,
          role: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      // Local login: req.user — DB dan to'liq user
      if (isLocalLogin() && req.user?.id) {
        const u = await authStorage.getUser(req.user.id);
        return res.json(u ? { ...u, passwordHash: undefined } : req.user);
      }
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
