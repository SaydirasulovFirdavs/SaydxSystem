import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  const [exporting, setExporting] = useState(false);
  const { data: report, isLoading } = useQuery({
    queryKey: ["/api/analytics/report"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/report", { credentials: "include" });
      if (!res.ok) throw new Error("Hisobot yuklanmadi");
      return res.json();
    },
  });

  const formatNum = (n: number) => new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(n);

  const handleExportCSV = () => {
    if (!report) return;
    setExporting(true);
    const rows: string[] = ["Oylik hisobot", "Oy,Kirim,Chiqim,Foyda"];
    report.byMonth?.forEach(([key, v]: [string, { revenue: number; expense: number }]) => {
      rows.push(`${key},${v.revenue},${v.expense},${v.revenue - v.expense}`);
    });
    rows.push("", "Mijoz bo'yicha daromad", "Mijoz,Daromad");
    report.byClient?.forEach((c: { clientName: string; revenue: number }) => {
      rows.push(`${c.clientName},${c.revenue}`);
    });
    rows.push("", "Loyiha bo'yicha foyda", "Loyiha,Kirim,Chiqim,Foyda");
    report.byProject?.forEach((p: { projectName: string; income: number; expense: number; profit: number }) => {
      rows.push(`${p.projectName},${p.income},${p.expense},${p.profit}`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `S-UBOS-hisobot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
  };

  if (isLoading) return <AppLayout><LoadingSpinner message="Hisobot yuklanmoqda..." /></AppLayout>;
  if (!report) return null;

  const monthNames = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
  const chartData = (report.byMonth || []).map(([key, v]: [string, { revenue: number; expense: number }]) => {
    const [, mo] = key.split("-");
    return {
      name: monthNames[Number(mo) - 1],
      Kirim: v.revenue,
      Chiqim: v.expense,
      Foyda: v.revenue - v.expense,
    };
  });

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Analitika va hisobotlar</h1>
          <p className="text-muted-foreground">Oylik hisobot, mijoz va loyiha bo'yicha foyda.</p>
        </div>
        <Button onClick={handleExportCSV} disabled={exporting} variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Download className="w-4 h-4 mr-2" /> Excel (CSV) yuklash
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Oylik kirim va chiqim</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.7)" }} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.7)" }} tickFormatter={v => (v / 1e6).toFixed(0) + "M"} />
                <Tooltip contentStyle={{ background: "rgba(10,10,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} formatter={(v: number) => formatNum(v)} />
                <Legend />
                <Bar dataKey="Kirim" fill="hsl(150 70% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Chiqim" fill="hsl(0 70% 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Foyda" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Mijoz bo'yicha daromad</h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {(report.byClient || []).map((c: { clientName: string; revenue: number }) => (
              <div key={c.clientName} className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white font-medium">{c.clientName}</span>
                <span className="text-emerald-400 font-bold">{formatNum(c.revenue)} UZS</span>
              </div>
            ))}
            {(!report.byClient || report.byClient.length === 0) && (
              <p className="text-muted-foreground text-sm">Ma'lumot yo'q</p>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <h3 className="text-lg font-bold text-white p-4 border-b border-white/5">Loyiha bo'yicha foyda</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="p-4 text-sm font-medium text-white/70">Loyiha</th>
              <th className="p-4 text-sm font-medium text-white/70 text-right">Kirim</th>
              <th className="p-4 text-sm font-medium text-white/70 text-right">Chiqim</th>
              <th className="p-4 text-sm font-medium text-white/70 text-right">Foyda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(report.byProject || []).map((p: { projectName: string; income: number; expense: number; profit: number }) => (
              <tr key={p.projectName} className="hover:bg-white/[0.02]">
                <td className="p-4 text-white font-medium">{p.projectName}</td>
                <td className="p-4 text-right text-emerald-400">{formatNum(p.income)}</td>
                <td className="p-4 text-right text-destructive">{formatNum(p.expense)}</td>
                <td className="p-4 text-right font-bold text-white">{formatNum(p.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
