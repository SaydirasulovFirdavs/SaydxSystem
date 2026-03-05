import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/auth — namuna auth endpoint
 * Haqiqiy login uchun /api/login ishlatiladi
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
    const adminUser = process.env.ADMIN_USERNAME ?? "admin";
    const adminPass = process.env.ADMIN_PASSWORD ?? "admin123";
    if (!username || !password) {
      return res.status(400).json({ ok: false, message: "Login yoki parol noto'g'ri" });
    }
    if (username === adminUser && password === adminPass) {
      return res.status(200).json({ ok: true, message: "Muvaffaqiyatli kirish" });
    }
    return res.status(401).json({ ok: false, message: "Login yoki parol noto'g'ri" });
  } catch (err) {
    console.error("[api/auth]", err);
    return res.status(500).json({ ok: false, message: "Server bilan bog'lanishda xato" });
  }
}
