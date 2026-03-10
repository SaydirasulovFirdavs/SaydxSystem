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
            <span className="text-xs text-white/50 font-medium tracking-wide">Ko'rsatish:</span>
            <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-md shadow-inner">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-4 text-sm font-bold tracking-wider transition-all duration-300 rounded-lg ${displayCurrency === "UZS" ? "bg-gradient-to-r from-blue-600/80 to-indigo-600/80 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                onClick={() => setDisplayCurrency("UZS")}
              >
                UZS
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-4 text-sm font-bold tracking-wider transition-all duration-300 rounded-lg ${displayCurrency === "USD" ? "bg-gradient-to-r from-blue-600/80 to-indigo-600/80 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                onClick={() => setDisplayCurrency("USD")}
              >
                USD
              </Button>
            </div>
          </div>
        </div>

        {/* Stats: ixcham grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {statCards.map((stat, i) => {
            const card = (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 100 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={`group relative glass-panel rounded-3xl p-5 hover:border-white/20 transition-all duration-500 overflow-hidden ${stat.title === "Tugallangan" ? "cursor-pointer hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]" : "hover:shadow-2xl"}`}
              >
                {/* Decorative background glow */}
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${stat.bg.replace('/10', '')}`} />

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">{stat.title}</p>
                    <p className={`text-xl font-black tracking-tight break-words group-hover:drop-shadow-md transition-all ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`shrink-0 p-3 rounded-2xl ${stat.bg} border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </motion.div>
            );
            return stat.title === "Tugallangan" ? <Link key={stat.title} href="/projects/completed">{card}</Link> : card;
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="lg:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden group border-white/5 hover:border-white/10 transition-colors"
          >
            {/* Ambient Chart Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Daromadlar dinamikasi
            </h3>
            <div className="h-[300px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }} tickFormatter={chartTickFormatter} axisLine={false} tickLine={false} tickMargin={10} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "rgba(0, 0, 0, 0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(12px)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "#fff", fontWeight: "bold" }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}
                    formatter={(val: number) => [chartTooltipFormatter(val), "Kirim"]}
                    labelFormatter={(label) => label}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="url(#strokeGradient)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Loyihalar holati — yaxshilangan */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="glass-panel rounded-3xl p-6 flex flex-col items-center border-white/5 hover:border-white/10 transition-colors relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />

            <h3 className="text-lg font-bold text-white mb-8 w-full flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-400" /> Loyihalar holati
            </h3>
            <div className="space-y-6 w-full relative z-10">
              {projectStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-4 group">
                  <span
                    className={`w-24 text-xs font-bold uppercase tracking-widest shrink-0 transition-colors ${entry.name === "Faol"
                        ? "text-sky-400 group-hover:text-sky-300"
                        : entry.name === "Tugallangan"
                          ? "text-emerald-400 group-hover:text-emerald-300"
                          : "text-rose-400 group-hover:text-rose-300"
                      }`}
                  >
                    {entry.name}
                  </span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden bg-black/40 border border-white/5 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: totalProjects ? `${(entry.count / totalProjects) * 100}%` : "0%" }}
                      transition={{ delay: 0.6 + (index * 0.1), duration: 1, type: "spring", bounce: 0.2 }}
                      className="h-full rounded-full relative"
                      style={{
                        backgroundColor: entry.fill,
                        boxShadow: `0 0 10px ${entry.fill}80` // Add dynamic glow
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    </motion.div>
                  </div>
                  <span className="text-lg font-black text-white w-8 text-right drop-shadow-md">{entry.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto w-full pt-6 border-t border-white/5 relative z-10 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Barcha Loyihalar</span>
              <span className="text-2xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{totalProjects}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
