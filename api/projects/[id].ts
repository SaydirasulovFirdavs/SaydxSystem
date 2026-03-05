import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../lib.js";
import { api } from "../../shared/routes.js";

/**
 * GET/PUT /api/projects/:id
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }
  if (req.method === "GET") {
    try {
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      return res.json(project);
    } catch (err) {
      console.error("[api/projects/:id GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "PUT") {
    try {
      const input = api.projects.update.input.parse(req.body);
      const updated = await storage.updateProject(id, input);
      if (!updated) return res.status(404).json({ message: "Project not found" });
      return res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to update project" });
    }
  }
  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ message: "Method Not Allowed" });
}
