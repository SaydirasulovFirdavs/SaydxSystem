import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../lib.js";

/**
 * DELETE /api/invoices/:id/items/:itemId
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const itemId = Number((req.query as { itemId?: string }).itemId);
  const id = Number((req.query as { id?: string }).id);
  if (!itemId || Number.isNaN(itemId) || !id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    await storage.deleteInvoiceItem(itemId);
    const remaining = await storage.getInvoiceItems(id);
    const total = remaining.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
    await storage.updateInvoice(id, { amount: String(total) });
    return res.status(204).send("");
  } catch (err) {
    console.error("[api/invoices/:id/items/:itemId DELETE]", err);
    return res.status(500).json({ message: "Failed to delete item" });
  }
}
