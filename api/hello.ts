import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/hello
 * Example health check / ping endpoint
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  res.status(200).json({
    message: "Hello from Vercel API",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
  });
}
