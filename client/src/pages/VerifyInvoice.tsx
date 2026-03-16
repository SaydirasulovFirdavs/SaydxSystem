import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, FileText, ArrowLeft, ShieldCheck, Calendar, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VerifyInvoice() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/public/verify-invoice/${token}`);
        if (!res.ok) {
          throw new Error("Hisob-faktura topilmadi yoki belgi noto'g'ri.");
        }
        const data = await res.json();
        setInvoice(data.invoice);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <div className="flex flex-col items-center mb-8">
           <Link href="/">
              <img src="/logo.png" alt="SAYD.X" className="w-24 h-24 mb-4 object-contain cursor-pointer" />
           </Link>
           <h1 className="text-2xl font-black text-white tracking-widest uppercase">Haqiqiylikni tekshirish</h1>
           <p className="text-slate-400 text-sm mt-2">SAYD.X ERP Secure Verification System</p>
        </div>

        <Card className="glass-panel border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardContent className="p-8">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-white font-medium">Ma'lumotlar tekshirilmoqda...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Xatolik yuz berdi</h2>
                <p className="text-rose-400 mb-8">{error}</p>
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                  <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Bosh sahifaga qaytish</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h2 className="text-emerald-500 font-black uppercase text-sm tracking-widest leading-none mb-1">Tasdiqlangan</h2>
                    <p className="text-slate-400 text-[10px] leading-tight">Ushbu hujjat haqiqiy va tizim tomonidan ro'yxatga olingan.</p>
                  </div>
                </div>

                <div className="flex justify-center -mt-4">
                  <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] border shadow-2xl backdrop-blur-md ${
                    invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' :
                    invoice.status === 'unpaid' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10' :
                    'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10'
                  }`}>
                    {invoice.status === 'paid' ? "To'langan" : 
                     invoice.status === 'unpaid' ? "To'lanmadi" : "Kutilmoqda"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                       <FileText className="w-3 h-3" /> Faktura raqami
                    </label>
                    <p className="text-lg font-bold text-white uppercase tracking-tight">{invoice.invoiceNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                         <User className="w-3 h-3" /> Mijoz
                      </label>
                      <p className="text-sm font-bold text-white">{invoice.clientName || "---"}</p>
                      <p className="text-[10px] text-slate-500">{invoice.company || ""}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Calendar className="w-3 h-3" /> Sana
                      </label>
                      <p className="text-sm font-bold text-white">{format(new Date(invoice.createdAt), "dd.MM.yyyy")}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <div className="flex justify-between items-end">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                         <DollarSign className="w-3 h-3" /> Jami summa
                       </label>
                       <div className="text-right">
                          <span className="text-3xl font-black text-white tracking-tighter">
                            {new Intl.NumberFormat().format(Number(invoice.amount))}
                          </span>
                          <span className="ml-2 text-sm font-bold text-blue-500 uppercase">{invoice.currency}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 text-center">
                   <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-4">SAYD.X DIGITAL SOLUTIONS ERP</p>
                   <a href="https://saydx.uz" target="_blank" rel="noreferrer" className="text-blue-500/50 hover:text-blue-500 transition-colors text-xs font-black uppercase tracking-widest">
                     saydx.uz
                   </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
