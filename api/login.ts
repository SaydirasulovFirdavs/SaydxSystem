import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/login — frontend Login.tsx uchun
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
    const adminUser = process.env.ADMIN_USERNAME ?? "admin";
    const adminPass = process.env.ADMIN_PASSWORD ?? "admin123";
    if (!username || !password) {
      return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    }
    if (username === adminUser && password === adminPass) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
  } catch (err) {
    console.error("[api/login]", err);
    return res.status(500).json({ message: "Server bilan bog'lanishda xato" });
  }
}
