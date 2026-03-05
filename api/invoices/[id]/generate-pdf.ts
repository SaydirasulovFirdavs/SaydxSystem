import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * POST /api/invoices/:id/generate-pdf
 * Eslatma: Puppeteer Vercel serverless da ishlamaydi.
 * PDF generatsiya uchun external xizmat (Cloud Run, Render) yoki Vercel OG ishlatish tavsiya etiladi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  return res.status(501).json({
    message: "PDF generatsiya Vercel serverless da qo'llab-quvvatlanmaydi. Tashqi xizmatdan foydalaning.",
  });
}
