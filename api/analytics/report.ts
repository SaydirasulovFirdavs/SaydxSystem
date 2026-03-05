import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage, toUzs, getCurrency } from "../lib.js";

/**
 * GET /api/analytics/report
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const [projects, txs, clients, currencyResult] = await Promise.all([
      storage.getProjects(),
      storage.getTransactions(),
      storage.getClients(),
      getCurrency(),
    ]);
    const usdToUzs = currencyResult.rate;
    const now = new Date();
    const byMonth: Record<string, { revenue: number; expense: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = { revenue: 0, expense: 0 };
    }
    txs.forEach((t) => {
      const key = new Date(t.date).toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { revenue: 0, expense: 0 };
      const amt = toUzs(t, usdToUzs);
      if (t.type === "income") byMonth[key].revenue += amt;
      else byMonth[key].expense += amt;
    });
    const byClient: { clientId: number; clientName: string; revenue: number }[] = [];
    clients.forEach((c) => {
      const rev = txs
        .filter((t) => {
          const p = projects.find((x) => x.id === t.projectId);
          return t.type === "income" && p && p.clientId === c.id;
        })
        .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
      if (rev > 0) byClient.push({ clientId: c.id, clientName: c.name, revenue: rev });
    });
    const byProject: { projectId: number; projectName: string; income: number; expense: number; profit: number }[] = [];
    projects.forEach((p) => {
      const income = txs
        .filter((t) => t.projectId === p.id && t.type === "income")
        .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
      const expense = txs
        .filter((t) => t.projectId === p.id && t.type === "expense")
        .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
      byProject.push({ projectId: p.id, projectName: p.name, income, expense, profit: income - expense });
    });
    return res.json({ byMonth: Object.entries(byMonth), byClient, byProject });
  } catch (err) {
    console.error("[api/analytics/report]", err);
    return res.status(500).json({ message: "Internal Error" });
  }
}
