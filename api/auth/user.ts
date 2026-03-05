import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/auth/user — useAuth uchun
 * DISABLE_AUTH=true bo'lsa mock user qaytaradi
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
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
    return res.json({
      id: "local-user",
      email: process.env.ADMIN_USERNAME ?? "admin",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/auth/user]", err);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
}
