import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../lib.js";

const defaultPaymentDetailLines = [
  { title: "Bank nomi", value: "Your Bank Name" },
  { title: "Hisob raqami", value: "1234 5678 9012 3456" },
];

function parsePaymentDetailLines(raw: string | null): { title: string; value: string }[] {
  if (!raw || !raw.trim()) return defaultPaymentDetailLines;
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return defaultPaymentDetailLines;
    return arr.map((x: unknown) =>
      x && typeof x === "object" && "title" in x && "value" in x
        ? { title: String((x as { title: unknown }).title), value: String((x as { value: unknown }).value) }
        : { title: "", value: "" }
    ).filter((x: { title: string; value: string }) => x.title || x.value);
  } catch {
    return defaultPaymentDetailLines;
  }
}

/**
 * GET/PUT /api/settings/invoice
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const row = await storage.getInvoiceSettings();
      const defaults = {
        companyName: "SAYD.X LLC",
        address: "Toshkent, O'zbekiston",
        phone: "+998 90 000 00 00",
        email: "info@saydx.uz",
        website: "saydx.uz",
        bankName: "Your Bank Name",
        accountNumber: "1234 5678 9012 3456",
        paymentDetailLines: defaultPaymentDetailLines,
        paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
        authorizedName: "Authorized Name",
        authorizedPosition: "Position",
      };
      if (!row) return res.json(defaults);
      const paymentDetailLines = parsePaymentDetailLines(row.paymentDetailLines);
      return res.json({ ...row, paymentDetailLines });
    } catch (err) {
      console.error("[api/settings/invoice GET]", err);
      return res.status(500).json({ message: "Sozlamalarni o'qishda xato" });
    }
  }
  if (req.method === "PUT") {
    try {
      const body = req.body as unknown;
      const input = z
        .object({
          companyName: z.string().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          website: z.string().optional(),
          bankName: z.string().optional(),
          accountNumber: z.string().optional(),
          paymentDetailLines: z
            .array(
              z.object({
                title: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
                value: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
              })
            )
            .optional(),
          paymentNote: z.string().optional(),
          authorizedName: z.string().optional(),
          authorizedPosition: z.string().optional(),
        })
        .parse(body);
      const updated = await storage.upsertInvoiceSettings(input);
      const paymentDetailLines = parsePaymentDetailLines(updated.paymentDetailLines);
      return res.json({ ...updated, paymentDetailLines });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
      }
      return res.status(500).json({ message: "Sozlamalarni saqlashda xato." });
    }
  }
  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ message: "Method Not Allowed" });
}
