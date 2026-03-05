import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage, toUzs, getCurrency } from "../lib.js";

/**
 * GET /api/dashboard/stats
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  try {
    const [projects, txs, totalMinutes, currencyResult] = await Promise.all([
      storage.getProjects(),
      storage.getTransactions(),
      storage.getTotalLoggedMinutes(),
      getCurrency(),
    ]);
    const usdToUzs = currencyResult.rate;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const completedProjects = projects.filter((p) => p.status === "completed").length;
    const delayedProjects = projects.filter((p) => p.status === "delayed").length;
    const totalRevenue = txs.filter((t) => t.type === "income").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
    const totalExpenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const averageHourlyRevenue = totalHours > 0 ? Math.round(netProfit / totalHours) : 0;
    const now = new Date();
    const last12Months: { monthKey: string; revenue: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const rev = txs
        .filter((t) => t.type === "income" && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
        .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
      const exp = txs
        .filter((t) => t.type === "expense" && new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd)
        .reduce((s, t) => s + toUzs(t, usdToUzs), 0);
      last12Months.push({ monthKey, revenue: rev, expense: exp });
    }
    const deadlineRiskCount = projects.filter(
      (p) => p.status === "active" && new Date(p.deadlineDate) < now && p.progress < 100
    ).length;
    return res.json({
      activeProjects,
      completedProjects,
      delayedProjects,
      totalRevenue,
      totalExpenses,
      netProfit,
      totalHours,
      averageHourlyRevenue,
      monthlyStats: last12Months,
      deadlineRiskCount,
      currencyRateSource: currencyResult.source,
    });
  } catch (err) {
    console.error("[api/dashboard/stats]", err);
    return res.status(500).json({ message: "Internal Error" });
  }
}
