import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../lib.js";

/**
 * PUT /api/invoices/:id
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid invoice id" });
  }
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const { status, amount } = (req.body ?? {}) as { status?: string; amount?: string };
    const updated = await storage.updateInvoice(id, { status, amount });
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    return res.json(updated);
  } catch (err) {
    console.error("[api/invoices/:id PUT]", err);
    return res.status(500).json({ message: "Failed to update invoice" });
  }
}
