import { useDashboardStats } from "@/hooks/use-dashboard";
import { useCurrency } from "@/hooks/use-currency";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { useState } from "react";
import { Briefcase, CheckCircle, Clock, DollarSign, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const { displayCurrency, setDisplayCurrency, formatMoney, toUsd, uzsPerUsd } = useCurrency();
  const [hideCurrencyBanner, setHideCurrencyBanner] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Boshqaruv paneli yuklanmoqda..." />
      </AppLayout>
    );
  }

  if (isError || !stats) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center">
          <p className="text-destructive font-medium">
            Boshqaruv paneli statistikasi yuklanmadi. Server yoki bazaga ulanishda xato.
          </p>
          <Button onClick={() => refetch()} variant="outline" className="border-primary text-primary">
            Qayta yuklash
          </Button>
        </div>
      </AppLayout>
    );
  }

  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  const revenueData = (stats.monthlyStats || []).map((m) => {
    const [y, mo] = m.monthKey.split("-");
    return {
      name: `${monthNames[Number(mo) - 1]} ${y.slice(2)}`,
      revenue: m.revenue,
      expense: m.expense,
      foyda: m.revenue - m.expense,
    };
  });

  const statCards = [
    { title: "Jami Daromad", value: formatMoney(stats.totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Sof Foyda", value: formatMoney(stats.netProfit), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { title: "Jami Xarajat", value: formatMoney(stats.totalExpenses), icon: Activity, color: "text-red-400", bg: "bg-red-500/10" },
    { title: "Ishlangan soat", value: stats.totalHours.toFixed(1), icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Soatlik daromad", value: formatMoney(stats.averageHourlyRevenue || 0), icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { title: "Faol", value: stats.activeProjects.toString(), icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "Tugallangan", value: stats.completedProjects.toString(), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "Kechikkan", value: stats.delayedProjects.toString(), icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
    { title: "Muddat xavfi", value: (stats.deadlineRiskCount ?? 0).toString(), icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const projectStatusData = [
    { name: "Faol", count: stats.activeProjects, fill: "hsl(var(--primary))", short: "Faol" },
    { name: "Tugallangan", count: stats.completedProjects, fill: "hsl(150 70% 45%)", short: "Tugallangan" },
    { name: "Kechikkan", count: stats.delayedProjects, fill: "hsl(15 90% 55%)", short: "Kechikkan" },
  ];
  const totalProjects = stats.activeProjects + stats.completedProjects + stats.delayedProjects;

  const chartTickFormatter = (val: number) => {
    if (displayCurrency === "USD") {
      const usd = val / uzsPerUsd;
      if (usd >= 1_000_000) return `${(usd / 1_000_000).toFixed(1)}M`;
      if (usd >= 1000) return `${(usd / 1000).toFixed(0)}K`;
      return usd.toFixed(0);
    }
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return String(val);
  };
  const chartTooltipFormatter = (val: number) => formatMoney(val);

  const currencyFromApi = stats.currencyRateSource === "api";

  return (
    <AppLayout>
      <div className="space-y-5">
        {!currencyFromApi && !hideCurrencyBanner && (
          <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm relative pr-10">
            <strong>Kurs API orqali olinmadi.</strong> Daromad va xarajatlar hozir qo'lda kiritilgan yoki standart kurs bo'yicha hisoblanmoqda. To'g'ri USD→UZS uchun Moliya bo'limida &quot;1 USD = ... UZS&quot; kiriting va Saqlash bosing.
            <button type="button" onClick={() => setHideCurrencyBanner(true)} className="absolute top-3 right-3 text-amber-200/80 hover:text-white" aria-label="Yopish">×</button>
          </div>
        )}
        {/* Header + valyuta */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              Xush kelibsiz, <span className="text-gradient">Boshqaruv paneliga</span>
            </h1>
            <p className="text-muted-foreground text-sm">Biznesingizning so'nggi holati.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Ko'rsatish:</span>
            <div className="inline-flex rounded-lg border border-white/20 bg-white/5 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 text-sm ${displayCurrency === "UZS" ? "bg-primary/20 text-primary" : "text-white/60 hover:text-white"}`}
                onClick={() => setDisplayCurrency("UZS")}
              >
                UZS (so'm)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-3 text-sm ${displayCurrency === "USD" ? "bg-primary/20 text-primary" : "text-white/60 hover:text-white"}`}
                onClick={() => setDisplayCurrency("USD")}
              >
                USD
              </Button>
            </div>
          </div>
        </div>

        {/* Stats: ixcham grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {statCards.map((stat, i) => {
            const card = (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-panel rounded-xl p-4 hover:border-white/10 transition-colors ${stat.title === "Tugallangan" ? "cursor-pointer hover:border-emerald-500/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className={`text-lg font-bold break-words mt-0.5 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`shrink-0 p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            );
            return stat.title === "Tugallangan" ? <Link key={stat.title} href="/projects/completed">{card}</Link> : card;
          })}
        </div>

        {/* Charts: 2/3 + 1/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-panel rounded-xl p-4"
          >
            <h3 className="text-base font-bold text-white mb-4">Daromadlar dinamikasi</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickFormatter={chartTickFormatter} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "rgba(10, 10, 15, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(val: number) => [chartTooltipFormatter(val), "Kirim"]}
                    labelFormatter={(label) => label}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Loyihalar holati — yaxshilangan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="glass-panel rounded-xl p-4"
          >
            <h3 className="text-base font-bold text-white mb-4">Loyihalar holati</h3>
            <div className="space-y-3">
              {projectStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <span
                    className={`w-20 text-sm font-semibold shrink-0 ${
                      entry.name === "Faol"
                        ? "text-sky-400"
                        : entry.name === "Tugallangan"
                          ? "text-emerald-400"
                          : "text-rose-400"
                    }`}
                  >
                    {entry.name}
                  </span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden bg-white/10 flex">
                    <div
                      className="h-full rounded-lg transition-all flex items-center justify-end pr-2"
                      style={{
                        width: totalProjects ? `${(entry.count / totalProjects) * 100}%` : "0%",
                        backgroundColor: entry.fill,
                        minWidth: entry.count > 0 ? "2rem" : "0",
                      }}
                    >
                      {entry.count > 0 && <span className="text-xs font-bold text-white drop-shadow">{entry.count}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{entry.count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-white/5">
              Jami: <span className="font-medium text-white">{totalProjects}</span> ta loyiha
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
