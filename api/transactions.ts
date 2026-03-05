import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "./lib.js";
import { api } from "../shared/routes.js";

/**
 * GET/POST /api/transactions
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const txs = await storage.getTransactions();
      return res.json(txs);
    } catch (err) {
      console.error("[api/transactions GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const input = api.transactions.create.input
        .extend({
          projectId: z.coerce.number().optional(),
          amount: z.union([z.string(), z.number()]).transform((v) => String(v)),
        })
        .parse(req.body);
      const tx = await storage.createTransaction(input);
      return res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to create transaction" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
