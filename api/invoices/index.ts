import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../lib.js";
import { api } from "../../shared/routes.js";

/**
 * GET/POST /api/invoices
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const invoices = await storage.getInvoices();
      return res.json(invoices);
    } catch (err) {
      console.error("[api/invoices GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const input = api.invoices.create.input
        .extend({
          projectId: z.coerce.number(),
          invoiceNumber: z.string().optional(),
          amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
          dueDate: z
            .union([z.string(), z.date(), z.number()])
            .transform((v) => new Date(v)),
          status: z.enum(["paid", "pending", "unpaid"]).optional(),
          contractPartner: z.string().optional(),
          contractStartDate: z
            .union([z.string(), z.date(), z.number()])
            .optional()
            .transform((v) => (v ? new Date(v) : undefined)),
          contractEndDate: z
            .union([z.string(), z.date(), z.number()])
            .optional()
            .transform((v) => (v ? new Date(v) : undefined)),
        })
        .parse(req.body);
      const projectId = Number(input.projectId);
      if (!projectId || projectId < 1) {
        return res.status(400).json({ message: "Loyihani tanlang." });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(400).json({ message: "Tanlangan loyiha topilmadi." });
      }
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const invoice = await storage.createInvoice({
        ...input,
        invoiceNumber,
        dueDate: input.dueDate,
      });
      return res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const msg = err.errors[0]?.message || "Ma'lumotlar noto'g'ri.";
        return res.status(400).json({ message: msg, field: err.errors[0]?.path?.join?.(".") });
      }
      return res.status(500).json({ message: "Faktura yaratishda xato." });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
