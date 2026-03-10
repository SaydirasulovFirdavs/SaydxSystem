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
    const hourMs = 60 * 60 * 1000;
    const alerts: { type: string; projectId: number; title: string; message: string; date: string; hoursLeft?: number }[] = [];
    projects.forEach((p) => {
      if (p.status !== "active") return;
      const deadline = new Date(p.deadlineDate);
      const timeDiff = deadline.getTime() - now.getTime();
      const daysLeft = Math.ceil(timeDiff / day);
      const hoursLeft = Math.ceil(timeDiff / hourMs);

      if (daysLeft < 0) {
        alerts.push({ type: "deadline_overdue", projectId: p.id, title: p.name, message: `Muddat o'tgan (${Math.abs(daysLeft)} kun)`, date: p.deadlineDate.toISOString() });
      } else if (daysLeft === 0 && hoursLeft <= 0) {
        alerts.push({ type: "deadline_today", projectId: p.id, title: p.name, message: "Bugun tugaydi!", date: p.deadlineDate.toISOString() });
      } else if (hoursLeft > 0 && hoursLeft <= 24) {
        alerts.push({ type: "deadline_critical", projectId: p.id, title: p.name, message: `${hoursLeft} soat qoldi!`, date: p.deadlineDate.toISOString(), hoursLeft });
      } else if (daysLeft > 0 && daysLeft <= 10) {
        alerts.push({ type: "deadline_reminder", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: p.deadlineDate.toISOString() });
      }

      if ((p.paymentProgress ?? 0) < 100 && daysLeft < 3) {
        alerts.push({ type: "payment_alert", projectId: p.id, title: p.name, message: `To'lov ${p.paymentProgress ?? 0}%`, date: p.deadlineDate.toISOString() });
      }
    });

    // Sort alerts by priority
    const typePriority: Record<string, number> = {
      deadline_critical: 1,
      deadline_today: 2,
      deadline_overdue: 3,
      payment_alert: 4,
      deadline_reminder: 5
    };

    alerts.sort((a, b) => (typePriority[a.type] || 99) - (typePriority[b.type] || 99));

    return res.json(alerts.slice(0, 20));
  } catch (err) {
    console.error("[api/notifications]", err);
    return res.status(500).json({ message: "Internal Error" });
  }
}
