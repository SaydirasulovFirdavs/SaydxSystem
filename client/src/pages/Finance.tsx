import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction, useDeleteTransaction } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import {
  ArrowDownRight, ArrowUpRight, Plus, TrendingUp, TrendingDown,
  DollarSign, Percent, RefreshCw, X, Calendar, Clock, AlignLeft, Tag, Layers, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const FALLBACK_USD_UZS = 12500;

function toUzs(t: { amount: string; currency: string | null }, usdToUzs: number): number {
  return t.currency === "USD" ? Number(t.amount) * usdToUzs : Number(t.amount);
}

export default function Finance() {
  const { data: transactions, isLoading: isTransLoading } = useTransactions();
  const { data: projects } = useProjects();
  const { data: currencyData } = useQuery({
    queryKey: ["/api/currency-rate"],
    queryFn: async () => {
      const res = await fetch("/api/currency-rate", {
        credentials: "include",
        cache: "no-store"
      });
      const data = (await res.json()) as { usdToUzs?: number; currencyRateSource?: string };
      return data;
    },
  });
  const usdToUzs = currencyData?.usdToUzs ?? FALLBACK_USD_UZS;
  const currencyFromApi = currencyData?.currencyRateSource === "api";

  const createTrans = useCreateTransaction();
  const deleteTrans = useDeleteTransaction();
  const queryClient = useQueryClient();
  const [isTransDialogOpen, setIsTransDialogOpen] = useState(false);
  const [manualRateInput, setManualRateInput] = useState("");
  const [hideCurrencyBanner, setHideCurrencyBanner] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const { data: financeSettings } = useQuery({
    queryKey: ["/api/settings/finance"],
    queryFn: async () => {
      const res = await fetch("/api/settings/finance", { credentials: "include" });
      const data = (await res.json()) as { manualUsdToUzs?: number | null };
      return data;
    },
  });
  const savedManualRate = financeSettings?.manualUsdToUzs ?? null;

  const saveManualRate = async () => {
    const num = Number(manualRateInput.replace(/\s/g, ""));
    if (!Number.isFinite(num) || num <= 0) {
      alert("Iltimos, musbat son kiriting (masalan 12500).");
      return;
    }
    try {
      await fetch("/api/settings/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ manualUsdToUzs: num }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-rate"] });
      setManualRateInput("");
    } catch (_) {
      alert("Saqlashda xato.");
    }
  };

  if (isTransLoading) return <AppLayout><LoadingSpinner message="Moliya yuklanmoqda..." /></AppLayout>;

  const incomeCategories = ["Shartnoma summasi", "Qisman to'lov", "Oldindan to'lov", "Boshqa kirim"];
  const expenseCategories = ["Server", "Dizayn", "Domen", "Reklama", "Ish haqi", "Boshqa xarajat"];

  const totalIncome = (transactions?.filter(t => t.type === "income") || []).reduce((s, t) => s + toUzs(t, usdToUzs), 0);
  const totalExpense = (transactions?.filter(t => t.type === "expense") || []).reduce((s, t) => s + toUzs(t, usdToUzs), 0);
  const profit = totalIncome - totalExpense;
  const marginPercent = totalIncome > 0 ? Math.round((profit / totalIncome) * 100) : 0;

  const handleCreateTrans = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateVal = formData.get("date") as string;

    let dateObj: Date | undefined = undefined;
    if (dateVal) {
      dateObj = new Date(dateVal);
    }

    await createTrans.mutateAsync({
      projectId: formData.get("projectId") ? Number(formData.get("projectId")) : undefined,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || undefined,
      currency: (formData.get("currency") as string) || "UZS",
      date: dateObj as any
    });
    setIsTransDialogOpen(false);
  };

  const fmt = (n: number, cur = "UZS") =>
    new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + cur;

  const statCards = [
    {
      label: "Jami kirim",
      value: fmt(totalIncome),
      icon: ArrowUpRight,
      iconBg: "bg-emerald-500/15 border-emerald-500/30",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
      glow: "shadow-[0_0_30px_rgba(52,211,153,0.12)]",
      trend: TrendingUp,
    },
    {
      label: "Jami chiqim",
      value: fmt(totalExpense),
      icon: ArrowDownRight,
      iconBg: "bg-red-500/15 border-red-500/30",
      iconColor: "text-red-400",
      valueColor: "text-red-400",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.12)]",
      trend: TrendingDown,
    },
    {
      label: "Sof foyda",
      value: fmt(profit),
      icon: DollarSign,
      iconBg: "bg-primary/15 border-primary/30",
      iconColor: "text-primary",
      valueColor: profit >= 0 ? "text-white" : "text-red-400",
      glow: "shadow-[0_0_30px_rgba(0,240,255,0.12)]",
      trend: TrendingUp,
    },
    {
      label: "Marja",
      value: `${marginPercent}%`,
      icon: Percent,
      iconBg: "bg-violet-500/15 border-violet-500/30",
      iconColor: "text-violet-400",
      valueColor: "text-violet-400",
      glow: "shadow-[0_0_30px_rgba(167,139,250,0.12)]",
      trend: TrendingUp,
    },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Moliya tizimi</h1>
          <p className="text-muted-foreground text-sm">Kirim-chiqim va foyda bo'yicha umumiy ko'rinish</p>
        </div>

        {/* Add Transaction Button */}
        <Dialog open={isTransDialogOpen} onOpenChange={setIsTransDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-background font-bold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yangi Tranzaksiya
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 rounded-2xl max-w-lg p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <DialogTitle className="text-white text-xl font-display font-bold">Yangi tranzaksiya</DialogTitle>
              <DialogDescription className="text-white/50 text-sm mt-1">Kirim yoki chiqim ma'lumotlarini to'liq kiriting.</DialogDescription>
            </div>
            <form onSubmit={handleCreateTrans} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Turi</label>
                  <select name="type" className="w-full glass-input p-3 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="income" className="text-emerald-600 font-medium">Kirim (+)</option>
                    <option value="expense" className="text-red-600 font-medium">Chiqim (-)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Miqdor</label>
                  <Input name="amount" type="number" required className="glass-input text-white rounded-xl h-[46px] text-lg font-bold placeholder:text-white/20" placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Valyuta</label>
                  <select name="currency" className="w-full glass-input p-3 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="UZS" className="text-black">UZS — O'zbek so'm</option>
                    <option value="USD" className="text-black">USD — Dollar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Toifa</label>
                  <select name="category" required className="w-full glass-input p-3 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="" className="text-black">Tanlang...</option>
                    <optgroup label="Kirim" className="text-black">
                      {incomeCategories.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </optgroup>
                    <optgroup label="Chiqim" className="text-black">
                      {expenseCategories.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Sana va Vaqt</label>
                  <Input name="date" type="datetime-local" defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} className="glass-input text-white rounded-xl h-[46px] flex w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Loyiha (ixtiyoriy)</label>
                  <select name="projectId" className="w-full glass-input p-3 rounded-xl text-white text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="" className="text-black">Bog'lanmagan</option>
                    {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> Izoh (ixtiyoriy)</label>
                <Input name="description" className="glass-input text-white rounded-xl h-[46px]" placeholder="Qisqa tavsif..." />
              </div>

              <div className="pt-3">
                <Button type="submit" disabled={createTrans.isPending} className="w-full bg-primary hover:bg-primary/90 text-background font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all text-base">
                  {createTrans.isPending ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Currency Banner */}
      <AnimatePresence>
        {!currencyFromApi && !savedManualRate && !hideCurrencyBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm relative pr-10 flex items-start gap-3"
          >
            <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <div>
              <strong className="text-amber-300">Kurs tizimga kiritilmagan!</strong>{" "}
              USD hisob-kitob to'g'ri bo'lishi uchun quyida kursni qo'lda kiritib qo'ying (aks holda 12,500 UZS olinadi).

            </div>
            <button onClick={() => setHideCurrencyBanner(true)} className="absolute top-3 right-3 text-amber-200/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* USD Rate Input */}
      <div className="glass-panel rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-3 border border-white/5">
        <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest flex-shrink-0">
          <DollarSign className="w-3.5 h-3.5" />
          USD kursi
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">1 USD =</span>
          <Input
            type="number"
            min={1}
            placeholder={savedManualRate ? String(savedManualRate) : "12500"}
            value={manualRateInput}
            onChange={(e) => setManualRateInput(e.target.value)}
            className="w-28 glass-input text-white text-sm h-8"
          />
          <span className="text-white/60 text-sm">UZS</span>
        </div>
        <Button type="button" size="sm" onClick={saveManualRate} className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 h-8 text-xs font-semibold px-3">
          Saqlash
        </Button>
        {savedManualRate != null && (
          <span className="text-xs text-white/30 ml-1">Saqlangan: 1 USD = {savedManualRate.toLocaleString("uz-UZ")} UZS</span>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass-panel rounded-2xl p-5 border border-white/5 ${card.glow} relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
              style={{ background: i === 0 ? "#34d399" : i === 1 ? "#f87171" : i === 2 ? "#00f0ff" : "#a78bfa" }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-white/40 uppercase tracking-widest font-medium">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.iconBg}`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <p className={`text-xl font-bold leading-tight ${card.valueColor}`}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-panel rounded-2xl overflow-hidden border border-white/5"
      >
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-primary" />
            Tranzaksiyalar tarixi
          </h2>
          <span className="text-xs text-white/30">{transactions?.length ?? 0} ta yozuv</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Sana</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Toifa</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Loyiha</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest text-right">Miqdor</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-white/30 text-sm">
                    Hozircha tranzaksiyalar yo'q
                  </td>
                </tr>
              )}
              {transactions?.map((t, i) => {
                const isIncome = t.type === "income";
                const projectName = projects?.find(p => p.id === t.projectId)?.name;
                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedTx({ ...t, projectName })}
                    className="border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <span className="text-sm text-white/50 font-mono">
                        {format(new Date(t.date), "dd.MM.yyyy")}
                      </span>
                      <span className="text-xs text-white/25 ml-2">{format(new Date(t.date), "HH:mm")}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${isIncome
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}>
                        {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-white/50">
                        {projectName ? (
                          <span className="text-white/70 font-medium">{projectName}</span>
                        ) : (
                          <span className="text-white/20 italic text-xs">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`text-sm font-bold tabular-nums ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                        {isIncome ? "+" : "−"}{new Intl.NumberFormat("uz-UZ").format(Number(t.amount))}
                        <span className="text-xs font-normal ml-1 opacity-60">{t.currency || "UZS"}</span>
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {(transactions?.length ?? 0) > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <span className="text-xs text-white/30">Jami: {transactions?.length} ta tranzaksiya</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-400 font-semibold">+{fmt(totalIncome)}</span>
              <span className="text-white/20">|</span>
              <span className="text-red-400 font-semibold">−{fmt(totalExpense)}</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="glass-panel border-white/10 rounded-3xl max-w-md p-0 overflow-hidden shadow-2xl">
          {selectedTx && (
            <>
              <div className={`p-8 relative overflow-hidden ${selectedTx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30 mix-blend-screen"
                  style={{ background: selectedTx.type === 'income' ? '#34d399' : '#f87171' }} />

                <div className="flex items-start justify-between relative z-10 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-md shadow-lg ${selectedTx.type === 'income' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}>
                    {selectedTx.type === 'income' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${selectedTx.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                      {selectedTx.category}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (confirm("Ushbu tranzaksiyani o'chirmoqchimisiz?")) {
                          await deleteTrans.mutateAsync(selectedTx.id);
                          setSelectedTx(null);
                        }
                      }}
                      disabled={deleteTrans.isPending}
                      className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="relative z-10">
                  <p className="text-white/60 uppercase tracking-widest text-[10px] font-bold mb-1">Miqdor</p>
                  <h3 className={`text-4xl font-bold font-display tracking-tight ${selectedTx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedTx.type === 'income' ? '+' : '−'}
                    {new Intl.NumberFormat("uz-UZ").format(Number(selectedTx.amount))}
                    <span className="text-lg ml-1.5 opacity-60 font-medium">{selectedTx.currency || "UZS"}</span>
                  </h3>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Sana
                    </p>
                    <p className="text-white font-medium">{format(new Date(selectedTx.date), "dd MMMM, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Vaqt
                    </p>
                    <p className="text-white font-medium">{format(new Date(selectedTx.date), "HH:mm")}</p>
                  </div>
                </div>

                <div className="h-px w-full bg-white/5" />

                <div>
                  <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-2 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Asosiy loyiha
                  </p>
                  {selectedTx.projectName ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-white/90 font-medium text-sm">{selectedTx.projectName}</span>
                    </div>
                  ) : (
                    <p className="text-white/30 italic text-sm">Bog'lanmagan</p>
                  )}
                </div>

                {selectedTx.description && (
                  <>
                    <div className="h-px w-full bg-white/5" />
                    <div>
                      <p className="text-white/40 uppercase tracking-widest text-[10px] font-bold mb-2 flex items-center gap-1.5">
                        <AlignLeft className="w-3 h-3" /> Izoh
                      </p>
                      <p className="text-white/80 text-sm leading-relaxed p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        {selectedTx.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
