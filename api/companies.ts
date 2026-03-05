import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "./lib.js";
import { api } from "../shared/routes.js";

/**
 * GET/POST /api/companies
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const list = await storage.getCompanies();
      return res.json(list);
    } catch (err) {
      console.error("[api/companies GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input);
      return res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to create company" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
