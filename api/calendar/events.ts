import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../lib.js";

/**
 * GET /api/calendar/events
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const projects = await storage.getProjects();
    const events: { id: string; projectId: number; title: string; date: string; type: "start" | "deadline"; status: string }[] = [];
    for (const p of projects) {
      events.push({
        id: `${p.id}-start`,
        projectId: p.id,
        title: p.name,
        date: String(p.startDate),
        type: "start",
        status: p.status,
      });
      events.push({
        id: `${p.id}-deadline`,
        projectId: p.id,
        title: p.name,
        date: String(p.deadlineDate),
        type: "deadline",
        status: p.status,
      });
    }
    return res.json(events);
  } catch (err) {
    console.error("[api/calendar/events]", err);
    return res.status(500).json({ message: "Internal Error" });
  }
}
