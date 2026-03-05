import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../../lib.js";

/**
 * GET/POST /api/invoices/:id/items
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid invoice id" });
  }
  if (req.method === "GET") {
    try {
      const items = await storage.getInvoiceItems(id);
      return res.json(items);
    } catch (err) {
      console.error("[api/invoices/:id/items GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const body = z
        .object({
          title: z.string(),
          quantity: z.coerce.number().default(1),
          unitPrice: z.union([z.string(), z.number()]).transform((v) => String(v)),
          serviceType: z.enum(["row", "server", "api"]).optional(),
          startDate: z
            .union([z.string(), z.date()])
            .optional()
            .transform((v) => (v ? new Date(v) : undefined)),
          projectId: z.coerce.number().optional(),
        })
        .parse(req.body);
      const item = await storage.createInvoiceItem({
        invoiceId: id,
        title: body.title,
        quantity: body.quantity,
        unitPrice: body.unitPrice,
        serviceType: body.serviceType ?? "row",
        startDate: body.startDate ?? null,
        projectId: body.projectId ?? null,
      });
      const items = await storage.getInvoiceItems(id);
      const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
      await storage.updateInvoice(id, { amount: String(total) });
      return res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(500).json({ message: "Failed to add item" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
