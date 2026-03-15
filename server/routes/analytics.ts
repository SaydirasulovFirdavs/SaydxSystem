import type { Express } from "express";
import { storage } from "../storage";
import { getUsdToUzsRate } from "../currencyRate";

function toUzs(t: any, rate: number) {
    const amt = Number(t.amount);
    return t.currency === "USD" ? amt * rate : amt;
}

export function registerAnalyticsRoutes(app: Express, isAuthenticated: any) {
    // --- Analytics Report ---
    app.get("/api/analytics/report", isAuthenticated, async (_req, res) => {
        try {
            const [projects, txs, clients, currencyResult] = await Promise.all([
                storage.getProjects(),
                storage.getTransactions(),
                storage.getClients(),
                getUsdToUzsRate(() => storage.getFinanceSettings()),
            ]);
            const usdToUzs = currencyResult.rate;
            const now = new Date();
            const byMonth: Record<string, { revenue: number; expense: number }> = {};
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                byMonth[key] = { revenue: 0, expense: 0 };
            }
            txs.forEach(t => {
                const key = new Date(t.date).toISOString().slice(0, 7);
                if (!byMonth[key]) byMonth[key] = { revenue: 0, expense: 0 };
                const amt = toUzs(t, usdToUzs);
                if (t.type === "income") byMonth[key].revenue += amt;
                else byMonth[key].expense += amt;
            });
            const byClient: { clientId: number; clientName: string; revenue: number }[] = [];
            clients.forEach(c => {
                const rev = txs.filter(t => { const p = projects.find(x => x.id === t.projectId); return t.type === "income" && p && p.clientId === c.id; }).reduce((s, t) => s + toUzs(t, usdToUzs), 0);
                if (rev > 0) byClient.push({ clientId: c.id, clientName: c.name, revenue: rev });
            });
            const byProject: { projectId: number; projectName: string; income: number; expense: number; profit: number }[] = [];
            projects.forEach(p => {
                const income = txs.filter(t => t.projectId === p.id && t.type === "income").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
                const expense = txs.filter(t => t.projectId === p.id && t.type === "expense").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
                byProject.push({ projectId: p.id, projectName: p.name, income, expense, profit: income - expense });
            });
            res.json({ byMonth: Object.entries(byMonth), byClient, byProject });
        } catch (err) {
            res.status(500).json({ message: "Internal Error" });
        }
    });

    // --- In-app notifications ---
    app.get("/api/notifications", isAuthenticated, async (req, res) => {
        try {
            const user = req.user as any;
            let projects: any[];
            if (user.role === "admin") {
                projects = await storage.getProjects();
            } else {
                projects = await storage.getProjectsForEmployee(user.id);
            }
            const now = new Date();
            const day = 24 * 60 * 60 * 1000;
            const hourMs = 60 * 60 * 1000;
            const alerts: { type: string; projectId: number; title: string; message: string; date: string; hoursLeft?: number }[] = [];
            projects.forEach(p => {
                if (p.status !== "active") return;
                const deadline = new Date(p.deadlineDate);
                const timeDiff = deadline.getTime() - now.getTime();
                const daysLeft = Math.ceil(timeDiff / day);
                const hoursLeft = Math.ceil(timeDiff / hourMs);

                if (daysLeft < 0) {
                    alerts.push({ type: "deadline_overdue", projectId: p.id, title: p.name, message: `Muddat o'tgan (${Math.abs(daysLeft)} kun)`, date: p.deadlineDate.toISOString() });
                } else if (daysLeft === 0 && hoursLeft <= 0) {
                    alerts.push({ type: "deadline_today", projectId: p.id, title: p.name, message: "Bugun tugaydi!", date: p.deadlineDate.toISOString() });
                }

                if (hoursLeft > 0 && hoursLeft <= 24) {
                    alerts.push({ type: "deadline_critical", projectId: p.id, title: p.name, message: `${hoursLeft} soat qoldi!`, date: p.deadlineDate.toISOString(), hoursLeft });
                } else if (daysLeft > 0 && daysLeft <= 10) {
                    alerts.push({ type: "deadline_reminder", projectId: p.id, title: p.name, message: `${daysLeft} kun qoldi`, date: p.deadlineDate.toISOString() });
                }

                if ((p.paymentProgress ?? 0) < 100 && daysLeft < 3) {
                    alerts.push({ type: "payment_alert", projectId: p.id, title: p.name, message: `To'lov ${p.paymentProgress ?? 0}%`, date: p.deadlineDate.toISOString() });
                }
            });

            const typePriority: Record<string, number> = {
                deadline_critical: 1,
                deadline_today: 2,
                deadline_overdue: 3,
                payment_alert: 4,
                deadline_reminder: 5
            };
            alerts.sort((a, b) => (typePriority[a.type] || 99) - (typePriority[b.type] || 99));
            res.json(alerts.slice(0, 20));
        } catch (err) {
            res.status(500).json({ message: "Internal Error" });
        }
    });

    // --- Calendar events ---
    app.get("/api/calendar/events", isAuthenticated, async (req, res) => {
        try {
            const user = req.user as any;
            let projects: any[];
            if (user.role === "admin") {
                projects = await storage.getProjects();
            } else {
                projects = await storage.getProjectsForEmployee(user.id);
            }
            const events: { id: string; projectId: number; title: string; date: string; type: "start" | "deadline"; status: string }[] = [];
            for (const p of projects) {
                events.push({
                    id: `${p.id}-start`,
                    projectId: p.id,
                    title: p.name,
                    date: p.startDate.toISOString(),
                    type: "start",
                    status: p.status,
                });
                events.push({
                    id: `${p.id}-deadline`,
                    projectId: p.id,
                    title: p.name,
                    date: p.deadlineDate.toISOString(),
                    type: "deadline",
                    status: p.status,
                });
            }
            res.json(events);
        } catch (err) {
            res.status(500).json({ message: "Internal Error" });
        }
    });

    app.get("/api/health-check", (req, res) => {
        res.json({ status: "ok", time: new Date().toISOString() });
    });

    app.get("/api/public-test", (req, res) => {
        res.json({ message: "API is working", time: new Date().toISOString() });
    });

    // --- Dashboard Stats ---
    app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
        try {
            const [projects, txs, totalMinutes, currencyResult] = await Promise.all([
                storage.getProjects(),
                storage.getTransactions(),
                storage.getTotalLoggedMinutes(),
                getUsdToUzsRate(() => storage.getFinanceSettings()),
            ]);
            const usdToUzs = currencyResult.rate;
            const now = new Date();

            const activeProjects = projects.filter((p) => p.status === "active").length;
            const completedProjects = projects.filter((p) => p.status === "completed").length;
            const delayedProjects = projects.filter((p) => p.status === "delayed").length;

            const totalRevenue = txs.filter((t) => t.type === "income").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
            const totalExpenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + toUzs(t, usdToUzs), 0);
            const netProfit = totalRevenue - totalExpenses;

            const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
            const averageHourlyRevenue = totalHours > 0 ? Math.round(netProfit / totalHours) : 0;

            const monthlyStats: { monthKey: string; revenue: number; expense: number }[] = [];
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
                monthlyStats.push({ monthKey, revenue: rev, expense: exp });
            }

            const deadlineRiskCount = projects.filter(
                (p) => p.status === "active" && new Date(p.deadlineDate) < now && p.progress < 100
            ).length;

            res.json({
                activeProjects,
                completedProjects,
                delayedProjects,
                totalRevenue,
                totalExpenses,
                netProfit,
                totalHours,
                averageHourlyRevenue,
                monthlyStats,
                deadlineRiskCount,
                currencyRateSource: currencyResult.source,
            });
        } catch (err) {
            console.error("[api/dashboard/stats] Error:", err);
            res.status(500).json({ message: "Internal Error" });
        }
    });
}
