import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTransactions, useCreateTransaction } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      const res = await fetch("/api/currency-rate", { credentials: "include" });
      const data = (await res.json()) as { usdToUzs?: number; currencyRateSource?: string };
      return data;
    },
  });
  const usdToUzs = currencyData?.usdToUzs ?? FALLBACK_USD_UZS;
  const currencyFromApi = currencyData?.currencyRateSource === "api";

  const createTrans = useCreateTransaction();
  const queryClient = useQueryClient();
  const [isTransDialogOpen, setIsTransDialogOpen] = useState(false);
  const [pdfGeneratingId, setPdfGeneratingId] = useState<number | null>(null);
  const [manualRateInput, setManualRateInput] = useState("");
  const [hideCurrencyBanner, setHideCurrencyBanner] = useState(false);

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
    } catch (e) {
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
    await createTrans.mutateAsync({
      projectId: formData.get("projectId") ? Number(formData.get("projectId")) : undefined,
      type: formData.get("type") as string,
      amount: formData.get("amount") as string,
      category: formData.get("category") as string,
      description: (formData.get("description") as string) || undefined,
      currency: (formData.get("currency") as string) || "UZS"
    });
    setIsTransDialogOpen(false);
  };

  const handleDownloadPdf = async (inv: { id: number; pdfUrl?: string | null }) => {
    setPdfGeneratingId(inv.id);
    try {
      let url: string;
      if (inv.pdfUrl) {
        url = inv.pdfUrl;
      } else {
        const res = await fetch(`/api/invoices/${inv.id}/generate-pdf`, { method: "POST", credentials: "include" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "PDF yaratishda xato");
        }
        const data = await res.json();
        url = data.url;
        queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      }
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "PDF yuklanmadi");
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const formatCur = (n: number, cur = "UZS") => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n) + " " + cur;

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Moliya tizimi</h1>
          <p className="text-muted-foreground">Kirim-chiqim va foyda bo'yicha umumiy ko'rinish.</p>
        </div>
      </div>

      {!currencyFromApi && !hideCurrencyBanner && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm relative pr-10">
          <strong>Kurs API orqali olinmadi.</strong> Hozir qo'lda kiritilgan yoki standart kurs ishlatilmoqda. USD hisob-kitob to'g'ri bo'lishi uchun quyida &quot;1 USD = ... UZS&quot; maydoniga haqiqiy kursni kiriting va Saqlash bosing.
          <button type="button" onClick={() => setHideCurrencyBanner(true)} className="absolute top-3 right-3 text-amber-200/80 hover:text-white text-lg leading-none" aria-label="Yopish">×</button>
        </div>
      )}

      <div className="glass-panel rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3">
        <p className="text-sm text-muted-foreground w-full mb-0">USD kursi (API ishlamasa shu kurs ishlatiladi):</p>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm">1 USD =</span>
          <Input
            type="number"
            min={1}
            placeholder={savedManualRate ? String(savedManualRate) : "12500"}
            value={manualRateInput}
            onChange={(e) => setManualRateInput(e.target.value)}
            className="w-32 glass-input text-white"
          />
          <span className="text-white/80 text-sm">UZS</span>
        </div>
        <Button type="button" size="sm" onClick={saveManualRate} className="bg-primary text-primary-foreground">
          Saqlash
        </Button>
        {savedManualRate != null && (
          <span className="text-xs text-muted-foreground">Saqlangan: 1 USD = {savedManualRate.toLocaleString("uz-UZ")} UZS</span>
        )}
      </div>

      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Jami kirim</p>
            <p className="text-lg font-bold text-emerald-400">{formatCur(totalIncome)}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Jami chiqim</p>
            <p className="text-lg font-bold text-destructive">{formatCur(totalExpense)}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Foyda</p>
            <p className="text-lg font-bold text-white">{formatCur(profit)}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Marja %</p>
            <p className="text-lg font-bold text-primary">{marginPercent}%</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isTransDialogOpen} onOpenChange={setIsTransDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-background"><Plus className="w-4 h-4 mr-2"/>Yangi Tranzaksiya</Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader><DialogTitle className="text-white">Yangi tranzaksiya qo'shish</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTrans} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Turi</label>
                      <select name="type" className="w-full glass-input p-2 rounded-md text-white">
                        <option value="income" className="text-black">Kirim (+)</option>
                        <option value="expense" className="text-black">Chiqim (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Miqdor</label>
                      <Input name="amount" type="number" required className="glass-input text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Valyuta</label>
                    <select name="currency" className="w-full glass-input p-2 rounded-md text-white">
                      <option value="UZS" className="text-black">UZS</option>
                      <option value="USD" className="text-black">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Toifa</label>
                    <select name="category" required className="w-full glass-input p-2 rounded-md text-white">
                      <option value="" className="text-black">Tanlang...</option>
                      <optgroup label="Kirim" className="text-black">
                        {incomeCategories.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                      </optgroup>
                      <optgroup label="Chiqim" className="text-black">
                        {expenseCategories.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Izoh (ixtiyoriy)</label>
                    <Input name="description" className="glass-input text-white" placeholder="Qisqa tavsif" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Loyiha (ixtiyoriy)</label>
                    <select name="projectId" className="w-full glass-input p-2 rounded-md text-white">
                      <option value="" className="text-black">Bog'lanmagan</option>
                      {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                    </select>
                  </div>
                  <Button type="submit" disabled={createTrans.isPending} className="w-full bg-primary text-background">Saqlash</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-sm font-medium text-white/70">Sana</th>
                  <th className="p-4 text-sm font-medium text-white/70">Toifa</th>
                  <th className="p-4 text-sm font-medium text-white/70">Loyiha</th>
                  <th className="p-4 text-sm font-medium text-white/70 text-right">Miqdor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions?.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-sm text-white/80">{format(new Date(t.date), 'dd.MM.yyyy HH:mm')}</td>
                    <td className="p-4 text-sm text-white font-medium">{t.category}</td>
                    <td className="p-4 text-sm text-white/60">{projects?.find(p => p.id === t.projectId)?.name || '-'}</td>
                    <td className="p-4 text-sm font-bold text-right flex items-center justify-end gap-2">
                      {t.type === 'income' ? <ArrowUpRight className="text-emerald-400 w-4 h-4"/> : <ArrowDownRight className="text-destructive w-4 h-4"/>}
                      <span className={t.type === 'income' ? 'text-emerald-400' : 'text-destructive'}>
                        {new Intl.NumberFormat('uz-UZ').format(Number(t.amount))} {t.currency || 'UZS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    </AppLayout>
  );
}
