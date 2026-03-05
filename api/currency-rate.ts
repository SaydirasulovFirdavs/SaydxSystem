import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCurrency } from "./lib.js";

/**
 * GET /api/currency-rate
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const { rate: usdToUzs, source } = await getCurrency();
    return res.json({ usdToUzs, currencyRateSource: source });
  } catch (err) {
    console.error("[api/currency-rate]", err);
    return res.status(500).json({ usdToUzs: 12500, currencyRateSource: "fallback" });
  }
}
