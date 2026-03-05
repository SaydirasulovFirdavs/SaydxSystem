import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../../lib.js";
import { api } from "../../../shared/routes.js";

/**
 * GET/POST /api/projects/:id/tasks
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid project id" });
  }
  if (req.method === "GET") {
    try {
      const tasks = await storage.getTasksByProject(id);
      return res.json(tasks);
    } catch (err) {
      console.error("[api/projects/:id/tasks GET]", err);
      return res.status(500).json({ message: "Internal Error" });
    }
  }
  if (req.method === "POST") {
    try {
      const body = api.tasks.create.input
        .extend({ parentTaskId: z.coerce.number().optional() })
        .parse(req.body);
      const { parentTaskId, ...rest } = body;
      const task = await storage.createTask({
        ...rest,
        projectId: id,
        ...(parentTaskId != null && { parentTaskId }),
      });
      return res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      return res.status(500).json({ message: "Failed to create task" });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}
