import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../../../lib.js";
import { api } from "../../../shared/routes.js";

/**
 * POST /api/tasks/:id/time-entries
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid task id" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const input = api.timeEntries.create.input.parse(req.body);
    let userId = "system";
    const firstId = await storage.getFirstUserId();
    if (firstId) userId = firstId;
    const entry = await storage.createTimeEntry({
      ...input,
      taskId: id,
      userId,
    });
    return res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
    }
    return res.status(500).json({ message: "Failed to create time entry" });
  }
}
