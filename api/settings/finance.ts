import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../lib.js";

/**
 * GET/PUT /api/settings/finance
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const manualUsdToUzs = await storage.getManualUsdToUzs();
      return res.json({ manualUsdToUzs: manualUsdToUzs ?? null });
    } catch (err) {
      console.error("[api/settings/finance GET]", err);
      return res.status(500).json({ manualUsdToUzs: null });
    }
  }
  if (req.method === "PUT") {
    try {
      const { manualUsdToUzs } = (req.body ?? {}) as { manualUsdToUzs?: number };
      const rate = Number(manualUsdToUzs);
      if (!Number.isFinite(rate) || rate <= 0) {
        return res.status(400).json({ message: "Kurs musbat son bo'lishi kerak." });
      }
      await storage.setManualUsdToUzs(rate);
      return res.json({ manualUsdToUzs: Math.round(rate) });
    } catch (err) {
      console.error("[api/settings/finance PUT]", err);
      return res.status(500).json({ message: "Saqlashda xato." });
    }
  }
  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ message: "Method Not Allowed" });
}
