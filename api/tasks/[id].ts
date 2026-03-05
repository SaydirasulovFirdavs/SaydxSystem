import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { storage } from "../../lib.js";
import { api } from "../../shared/routes.js";

/**
 * PUT /api/tasks/:id
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = Number((req.query as { id?: string }).id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid task id" });
  }
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const input = api.tasks.update.input.parse(req.body);
    const current = await storage.getTask(id);
    if (!current) return res.status(404).json({ message: "Task not found" });
    const { id: _id, ...rest } = input as { id?: number; status?: string; reopenComment?: string; dueDate?: string | Date; [k: string]: unknown };
    const updates = { ...rest } as Record<string, unknown>;
    const newStatus = ((input as { status?: string }).status ?? current.status) as string;
    const cur = current as { status: string; inProgressStartedAt?: Date; completedAt?: Date };
    if (newStatus === "in progress" && cur.status !== "in progress" && !cur.inProgressStartedAt) {
      (updates as { inProgressStartedAt?: Date }).inProgressStartedAt = new Date();
    }
    if (newStatus === "done") {
      (updates as { completedAt?: Date }).completedAt = new Date();
    }
    if (newStatus === "todo" && cur.status === "done") {
      (updates as { completedAt?: null; inProgressStartedAt?: null }).completedAt = null;
      (updates as { completedAt?: null; inProgressStartedAt?: null }).inProgressStartedAt = null;
    }
    if ((rest as { dueDate?: string }).dueDate !== undefined) {
      (updates as { dueDate?: Date }).dueDate = (rest as { dueDate?: string }).dueDate ? new Date((rest as { dueDate: string }).dueDate) : null;
    }
    const updated = await storage.updateTask(id, updates);
    if (!updated) return res.status(404).json({ message: "Task not found" });
    return res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
    }
    return res.status(500).json({ message: "Failed to update task" });
  }
}
