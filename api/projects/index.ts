import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../lib.js";
import { api } from "../../shared/routes.js";

/**
 * GET/POST /api/projects
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const projects = await storage.getProjects();
      return res.json(projects);
    } catch (err) {
      console.error("[api/projects GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const bodySchema = api.projects.create.input.extend({
        clientId: z.coerce.number().optional(),
        companyId: z.coerce.number().optional(),
        budget: z.union([z.string(), z.number()]).transform((v) => String(v)),
        startDate: z
          .union([z.string(), z.date()])
          .transform((v) => new Date(v))
          .refine((d) => !Number.isNaN(d.getTime()), { message: "Boshlanish sanasi toʻgʻri boʻlishi kerak." }),
        deadlineDate: z
          .union([z.string(), z.date()])
          .transform((v) => new Date(v))
          .refine((d) => !Number.isNaN(d.getTime()), { message: "Tugash sanasi (muddat) toʻgʻri boʻlishi kerak." }),
        description: z.string().optional(),
        additionalRequirements: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
      });
      const input = bodySchema.parse(req.body);
      const hasClient = input.clientId != null && input.clientId > 0;
      const hasCompany = input.companyId != null && input.companyId > 0;
      if (!hasClient && !hasCompany) {
        return res.status(400).json({ message: "Mijoz yoki kompaniyani tanlang.", field: "clientId" });
      }
      const start = input.startDate as Date;
      const end = input.deadlineDate as Date;
      if (end < start) {
        return res.status(400).json({ message: "Tugash sanasi boshlanish sanasidan keyin boʻlishi kerak.", field: "deadlineDate" });
      }
      const project = await storage.createProject({
        ...input,
        clientId: hasClient ? input.clientId : null,
        companyId: hasCompany ? input.companyId : null,
        startDate: start,
        deadlineDate: end,
      });
      return res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Loyiha yaratishda xato." });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
