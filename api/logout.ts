import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/logout — frontend useAuth uchun
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  res.setHeader("Location", "/login");
  return res.status(302).send("");
}
