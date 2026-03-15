import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import {
  ArrowDownRight, ArrowUpRight, Plus, TrendingUp, TrendingDown,
  DollarSign, Percent, RefreshCw, X, Calendar, Clock, AlignLeft, Tag, Layers, Trash2, AlertOctagon,
  Globe, UserCog, Check, Edit2
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
      const data = (await res.json()) as { 
        usdToUzs: number; 
        currencyRateSource: string; 
        useAutomaticRate: boolean 
      };
      return data;
    },
  });
  const usdToUzs = currencyData?.usdToUzs ?? FALLBACK_USD_UZS;
  const isAuto = currencyData?.useAutomaticRate ?? true;
  const currencySource = currencyData?.currencyRateSource ?? "api";

  const createTrans = useCreateTransaction();
  const updateTrans = useUpdateTransaction();
  const deleteTrans = useDeleteTransaction();
  const queryClient = useQueryClient();
  const [isTransDialogOpen, setIsTransDialogOpen] = useState(false);
  const [manualRateInput, setManualRateInput] = useState("");
  const [hideCurrencyBanner, setHideCurrencyBanner] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: financeSettings } = useQuery({
    queryKey: ["/api/settings/finance"],
    queryFn: async () => {
      const res = await fetch("/api/settings/finance", { credentials: "include" });
      const data = (await res.json()) as { manualUsdToUzs?: number | null };
      return data;
    },
  });
  const savedManualRate = financeSettings?.manualUsdToUzs ?? null;

  const toggleAutoMode = async (enabled: boolean) => {
    try {
      await fetch("/api/settings/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ useAutomaticRate: enabled }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/currency-rate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/finance"] });
    } catch (_) {
      alert("Xato yuz berdi.");
    }
  };

  const saveManualRate = async () => {
    const num = Number(manualRateInput.replace(/\s/g, ""));
    if (!Number.isFinite(num) || num <= 0) {
      alert("Iltimos, musbat son kiriting.");
      return;
    }
    try {
      await fetch("/api/settings/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ manualUsdToUzs: num, useAutomaticRate: false }),
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

    const data = {
      projectId: formData.get("projectId") ? Number(formData.get("projectId")) : undefined,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || undefined,
      currency: (formData.get("currency") as string) || "UZS",
      date: dateObj as any
    };

    if (isEditMode && selectedTx) {
      await updateTrans.mutateAsync({ id: selectedTx.id, ...data });
      setIsEditMode(false);
      setSelectedTx(null);
    } else {
      await createTrans.mutateAsync(data);
    }
    setIsTransDialogOpen(false);
  };

  const fmt = (n: number, cur = displayCurrency) => {
    if (cur === "USD") {
      const val = n / usdToUzs;
      return new Intl.NumberFormat("en-US", { 
        style: "currency", 
        currency: "USD",
        maximumFractionDigits: 2 
      }).format(val);
    }
    return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + cur;
  };

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
      {/* Header Section */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                Moliya <span className="text-indigo-500">Tizimi</span>
              </h1>
            </div>
            <p className="text-white/40 font-medium tracking-wide uppercase text-[10px] pl-1">
              Kirim-chiqim va foyda bo'yicha <span className="text-indigo-400/60">umumiy tahlil</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 gap-1 mr-2 backdrop-blur-md">
              <button 
                onClick={() => setDisplayCurrency('UZS')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${displayCurrency === 'UZS' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'text-white/30 hover:text-white/50 hover:bg-white/5'}`}
              >
                UZS
              </button>
              <button 
                onClick={() => setDisplayCurrency('USD')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${displayCurrency === 'USD' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'text-white/30 hover:text-white/50 hover:bg-white/5'}`}
              >
                USD
              </button>
            </div>

            {/* Action Bar / Transaction Button */}
            <Dialog open={isTransDialogOpen} onOpenChange={(open) => {
              setIsTransDialogOpen(open);
              if (!open) setIsEditMode(false);
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setIsEditMode(false);
                  setIsTransDialogOpen(true);
                }} className="h-14 px-8 rounded-2xl bg-indigo-500 text-white font-black shadow-2xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 uppercase text-xs tracking-[0.2em] flex items-center gap-3">
                  <Plus className="w-4 h-4" />
                  Yangi Tranzaksiya
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10 rounded-[32px] max-w-lg p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                {/* Decorative Window Controls */}
                <div className="h-12 bg-white/[0.03] border-b border-white/5 flex items-center justify-between px-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/30" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                  </div>
                  <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{isEditMode ? "Tahrirlash" : "Sayd.x Finance"}</div>
                  <button onClick={() => setIsTransDialogOpen(false)} className="text-white/20 hover:text-white/40 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{isEditMode ? "Tranzaksiyani" : "Yangi"} <span className="text-indigo-500">{isEditMode ? "Tahrirlash" : "Tranzaksiya"}</span></h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Barcha maydonlarni diqqat bilan to'ldiring</p>
                  </div>
                  
                  <form id="transForm" onSubmit={handleCreateTrans} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Kategoriya Turi</label>
                        <select name="type" className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none">
                          <option value="income" className="bg-[#0a0a0c] text-emerald-400 uppercase font-black">Kirim (+)</option>
                          <option value="expense" className="bg-[#0a0a0c] text-rose-400 uppercase font-black">Chiqim (-)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Summa Miqdori</label>
                        <div className="relative">
                          <Input name="amount" type="number" required className="h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-lg font-black focus:border-indigo-500/50 placeholder:text-white/10" placeholder="0.00" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Hisob Valyutasi</label>
                        <select name="currency" className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none">
                          <option value="UZS" className="bg-[#0a0a0c] text-white uppercase font-black">UZS — So'm</option>
                          <option value="USD" className="bg-[#0a0a0c] text-white uppercase font-black">USD — Dollar</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Xizmat Toifasi</label>
                        <select name="category" required className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none">
                          <option value="" className="bg-[#0a0a0c] text-white/20 italic">Tanlang...</option>
                          <optgroup label="KIRIM" className="bg-[#0a0a0c] text-emerald-500 font-black">
                            {incomeCategories.map(c => <option key={c} value={c} className="bg-[#0a0a0c] text-white font-bold">{c}</option>)}
                          </optgroup>
                          <optgroup label="CHIQIM" className="bg-[#0a0a0c] text-rose-500 font-black">
                            {expenseCategories.map(c => <option key={c} value={c} className="bg-[#0a0a0c] text-white font-bold">{c}</option>)}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Amal Sanasi</label>
                        <Input name="date" type="datetime-local" defaultValue={format(new Date(), "yyyy-MM-dd'T'HH:mm")} className="h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white font-bold focus:border-indigo-500/50" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Tegishli Loyiha</label>
                        <select name="projectId" className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer appearance-none">
                          <option value="" className="bg-[#0a0a0c] text-white/20 italic">Bog'lanmagan</option>
                          {projects?.map(p => <option key={p.id} value={p.id} className="bg-[#0a0a0c] text-white font-bold">{p.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Qo'shimcha Izoh</label>
                      <Input name="description" className="h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-5 text-white font-medium focus:border-indigo-500/50 placeholder:text-white/10" placeholder="Tranzaksiya haqida qisqacha ma'lumot..." />
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                      <Button form="transForm" type="submit" disabled={createTrans.isPending || updateTrans.isPending} className="flex-1 h-16 rounded-2xl bg-indigo-500 text-white font-black shadow-2xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]">
                        {createTrans.isPending || updateTrans.isPending ? "Saqlanmoqda..." : (isEditMode ? "O'zgarishlarni Saqlash" : "Tranzaksiyani Tasdiqlash")}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Currency Management Bar */}
      <div className="mb-10 p-1.5 rounded-[24px] bg-white/[0.02] border border-white/5 backdrop-blur-xl flex flex-wrap items-center gap-4 shadow-2xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Auto/Manual Toggle */}
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 gap-1">
          <button 
            onClick={() => toggleAutoMode(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isAuto ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
          >
            <Globe className={`w-3.5 h-3.5 ${isAuto ? 'animate-pulse' : ''}`} />
            Avtomatik
          </button>
          <button 
            onClick={() => toggleAutoMode(false)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isAuto ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
          >
            <UserCog className="w-3.5 h-3.5" />
            Qo'lda
          </button>
        </div>

        <div className="h-8 w-px bg-white/5 mx-2 hidden sm:block" />

        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="flex-1 relative group/input">
            <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${!isAuto ? 'text-indigo-400' : 'text-white/10'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <Input
              type="text"
              placeholder={isAuto ? "Avtomatik rejim faol..." : "Kursni kiriting..."}
              disabled={isAuto}
              value={manualRateInput}
              onChange={(e) => setManualRateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveManualRate()}
              className={`w-full h-12 bg-white/[0.03] border-white/10 rounded-xl pl-12 pr-4 text-sm font-black transition-all ${!isAuto ? 'focus:border-indigo-500/50 focus:bg-white/[0.05] text-white' : 'text-white/20 border-white/5'}`}
            />
          </div>

          <Button 
            onClick={saveManualRate}
            disabled={isAuto || !manualRateInput}
            className={`h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${!isAuto ? 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95' : 'bg-white/5 text-white/10 overflow-hidden'}`}
          >
            Saqlash
          </Button>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
          <div className="relative">
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${isAuto ? 'animate-spin-slow' : ''}`} />
            {isAuto && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-white/30 uppercase font-black leading-none mb-1">Joriy Kurs (1 USD)</span>
            <span className="text-sm text-indigo-100 font-black tracking-tighter">
              {fmt(usdToUzs)}
            </span>
          </div>
          {isAuto && (
            <div className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <span className="text-[8px] text-emerald-400 font-black uppercase tracking-tighter">Live</span>
            </div>
          )}
          {!isAuto && (
            <div className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <span className="text-[8px] text-amber-400 font-black uppercase tracking-tighter">Manual</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative"
          >
            {/* Background Glow */}
            <div className={`absolute inset-0 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none ${
              i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-rose-500' : i === 2 ? 'bg-indigo-500' : 'bg-violet-500'
            }`} />
            
            <div className="relative glass-panel rounded-[32px] p-8 border border-white/5 overflow-hidden min-h-[160px] flex flex-col justify-between shadow-2xl transition-all duration-500 group-hover:translate-y-[-4px] group-hover:border-white/10">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:rotate-12 ${card.iconBg}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${card.iconBg} ${card.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Live
                </div>
              </div>

              {/* Value & Label */}
              <div>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1 pl-1 transition-colors group-hover:text-white/60">
                  {card.label}
                </p>
                <h3 className={`text-2xl font-black tabular-nums tracking-tighter ${card.valueColor}`}>
                  {card.value}
                </h3>
              </div>

              {/* Decorative Accent */}
              <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-30 transition-all duration-500 w-0 group-hover:w-full ${card.iconColor}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-[32px] overflow-hidden border border-white/5 shadow-2xl relative"
      >
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
        
        {/* Table Header / Action Bar */}
        <div className="px-10 py-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white/20" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                Tranzaksiyalar <span className="text-indigo-500">Tarixi</span>
              </h2>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">
                Barcha operatsiyalar xronologiyasi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">
              Jami: <span className="text-white ml-1">{transactions?.length ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-10 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5">Amaliyot Sanasi</th>
                <th className="px-10 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5">Toifasi</th>
                <th className="px-10 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5">Tegishli Loyiha</th>
                <th className="px-10 py-5 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5 text-right">Miqdor va Valyuta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {transactions?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Layers className="w-12 h-12" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hozircha ma'lumotlar mavjud emas</p>
                    </div>
                  </td>
                </tr>
              )}
              {transactions?.map((t, i) => {
                const isIncome = t.type === "income";
                const projectName = projects?.find(p => p.id === t.projectId)?.name;
                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.03 }}
                    onClick={() => setSelectedTx({ ...t, projectName })}
                    className="group hover:bg-white/[0.02] transition-all cursor-pointer relative"
                  >
                    <td className="px-10 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm text-white/60 font-black tabular-nums tracking-tight">
                          {format(new Date(t.date), "dd.MM.yyyy")}
                        </span>
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-0.5">
                          {format(new Date(t.date), "HH:mm")}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all group-hover:scale-105 ${
                        isIncome 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                        : "bg-rose-500/5 border-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
                      }`}>
                        {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.category}
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      {projectName ? (
                        <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                          <span className="text-sm font-bold tracking-tight">{projectName}</span>
                        </div>
                      ) : (
                        <span className="text-white/10 text-[10px] font-black uppercase tracking-widest">— Bog'lanmagan</span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-black tabular-nums tracking-tighter ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                          {isIncome ? "+" : "−"}{new Intl.NumberFormat("uz-UZ").format(Number(t.amount))}
                        </span>
                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mt-0.5 group-hover:text-white/40 transition-colors">
                          {t.currency || "UZS"}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {(transactions?.length ?? 0) > 0 && (
          <div className="px-10 py-6 border-t border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
              Xulosa: <span className="text-white/40 ml-2">{transactions?.length} Tranzaksiya</span>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest mb-0.5">Jami Kirim</span>
                <span className="text-sm font-black text-emerald-400 tabular-nums">+{fmt(totalIncome)}</span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-rose-500/40 uppercase tracking-widest mb-0.5">Jami Chiqim</span>
                <span className="text-sm font-black text-rose-400 tabular-nums">−{fmt(totalExpense)}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="glass-panel border-white/10 rounded-[40px] max-w-md p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.6)]">
          {selectedTx && (
            <>
              {/* Decorative Window Controls */}
              <div className="h-12 bg-white/[0.03] border-b border-white/5 flex items-center justify-between px-8">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                </div>
                <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Tranzaksiya Tafsiloti</div>
                <button onClick={() => setSelectedTx(null)} className="text-white/20 hover:text-white/40 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className={`p-10 relative overflow-hidden ${selectedTx.type === 'income' ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none ${
                    selectedTx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border backdrop-blur-xl shadow-2xl mb-6 transition-transform hover:scale-110 duration-500 ${
                      selectedTx.type === 'income' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'
                  }`}>
                    {selectedTx.type === 'income' ? <ArrowUpRight className="w-10 h-10" /> : <ArrowDownRight className="w-10 h-10" />}
                  </div>

                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border mb-4 ${
                      selectedTx.type === 'income' 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    {selectedTx.category}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Tranzaksiya Summasi</p>
                    <h3 className={`text-4xl font-black tabular-nums tracking-tighter ${selectedTx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedTx.type === 'income' ? '+' : '−'}{new Intl.NumberFormat("uz-UZ").format(Number(selectedTx.amount))}
                      <span className="text-lg ml-2 opacity-40 font-bold uppercase">{selectedTx.currency || "UZS"}</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-8 bg-[#0a0a0c]/50 backdrop-blur-md">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                       <Calendar className="w-3 h-3" /> Sana
                    </div>
                    <p className="text-sm font-black text-white tracking-tight italic">
                      {format(new Date(selectedTx.date), "dd MMMM, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                       <Clock className="w-3 h-3" /> Vaqt
                    </div>
                    <p className="text-sm font-black text-white tracking-tight italic">
                      {format(new Date(selectedTx.date), "HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                    <Layers className="w-3 h-3" /> Tegishli Loyiha
                  </div>
                  {selectedTx.projectName ? (
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group hover:bg-indigo-500/20 transition-all cursor-default overflow-hidden relative">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]" />
                      <span className="text-sm font-black text-indigo-100 tracking-tight uppercase italic">{selectedTx.projectName}</span>
                    </div>
                  ) : (
                    <div className="px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white/20 uppercase tracking-widest italic">
                      Bog'lanmagan
                    </div>
                  )}
                </div>

                {selectedTx.description && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                      <AlignLeft className="w-3 h-3" /> Tranzaksiya Izohi
                    </div>
                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 text-sm font-medium text-white/60 leading-relaxed italic relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 transition-all group-hover:bg-indigo-500" />
                      {selectedTx.description}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <Button
                    onClick={() => {
                      setIsEditMode(true);
                      setIsTransDialogOpen(true);
                    }}
                    className="flex-1 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Edit2 className="w-4 h-4" />
                    Tahrirlash
                  </Button>
                  <Button
                    onClick={async () => {
                      if (confirm("Ushbu tranzaksiyani butunlay o'chirib tashlamoqchimisiz?")) {
                        await deleteTrans.mutateAsync(selectedTx.id);
                        setSelectedTx(null);
                      }
                    }}
                    disabled={deleteTrans.isPending}
                    className="flex-1 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    O'chirib Tashlash
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
