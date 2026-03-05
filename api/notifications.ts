import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./lib.js";

/**
 * GET /api/notifications
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const projects = await storage.getProjects();
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const alerts: { type: string; projectId: number; title: string; message: string; date: string }[] = [];
    projects.forEach((p) => {
      if (p.status !== "active") return;
      const deadline = new Date(p.deadlineDate);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / day);
      if (daysLeft < 0) {
        alerts.push({ type: "deadline_overdue", projectId: p.id, title: p.name, message: "Muddat o'tgan", date: String(p.deadlineDate) });
      } else if (daysLeft <= 1) {
        alerts.push({ type: "deadline_1", projectId: p.id, title: p.name, message: "1 kun qoldi", date: String(p.deadlineDate) });
      } else if (daysLeft <= 3) {
        alerts.push({ type: "deadline_3", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: String(p.deadlineDate) });
      } else if (daysLeft <= 7) {
        alerts.push({ type: "deadline_7", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: String(p.deadlineDate) });
      }
      if ((p.paymentProgress ?? 0) < 100 && daysLeft < 3) {
        alerts.push({ type: "payment_alert", projectId: p.id, title: p.name, message: `To'lov ${p.paymentProgress ?? 0}%`, date: String(p.deadlineDate) });
      }
    });
    return res.json(alerts.slice(0, 20));
  } catch (err) {
    console.error("[api/notifications]", err);
    return res.status(500).json({ message: "Internal Error" });
  }
}
