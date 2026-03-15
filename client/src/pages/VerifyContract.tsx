import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Calendar, User, FileText, Building2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function VerifyContract() {
  const [, params] = useRoute("/verify-contract");
  const token = new URLSearchParams(window.location.search).get("token");

  const { data: result, isLoading, error } = useQuery<{
    contract: {
      contractNumber: string;
      clientName: string;
      amount: string;
      currency: string;
      startDate: string;
      endDate: string;
      status: string;
      company?: string;
      createdAt: string;
    }
  }>({
    queryKey: [`/api/public/verify-contract/${token}`],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-12 w-12 rounded-full mx-auto bg-slate-800" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4 mx-auto bg-slate-800" />
              <Skeleton className="h-4 w-1/2 mx-auto bg-slate-800" />
            </div>
            <div className="space-y-4 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-slate-800/50" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !token || !result) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md bg-slate-900/50 border-rose-500/20 backdrop-blur-xl text-center">
            <CardContent className="p-12 space-y-6">
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-12 h-12 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Shartnoma topilmadi</h1>
                <p className="text-slate-400">Tekshirish kodi noto'g'ri yoki shartnoma tizimda mavjud emas.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  const { contract } = result;
  const isExpired = new Date(contract.endDate) < new Date();

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 py-12">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex justify-center mb-6"
          >
            <img src="/logo.png" alt="SAYD.X" className="h-16 w-auto drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
          </motion.div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Haqiqiylikni tekshirish</h1>
          <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">SAYD.X ERP Secure Verification System</p>
        </div>

        <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-[2.5rem]">
          <CardContent className="p-8 sm:p-10 space-y-10">
            {/* Status Banner */}
            <div className="flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
              <ShieldCheck className="w-10 h-10 text-emerald-500 flex-shrink-0" />
              <div>
                <h2 className="text-emerald-500 font-black uppercase text-base tracking-widest leading-none mb-1.5">Tasdiqlangan</h2>
                <p className="text-slate-400 text-xs leading-tight">Ushbu shartnoma haqiqiy va tizim tomonidan ro'yxatga olingan.</p>
              </div>
            </div>

            {/* Contract Status Badge */}
            <div className="flex justify-center -mt-6">
              <div className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-2xl backdrop-blur-md ${
                contract.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                contract.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}>
                {contract.status === 'active' ? "Faol" : 
                 contract.status === 'completed' ? "Yakunlangan" : "Bekor qilingan"}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-8 pt-4">
              {/* Contract ID */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Shartnoma raqami
                </label>
                <p className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                  {contract.contractNumber}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Client */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Mijoz
                  </label>
                  <p className="text-base font-bold text-white leading-tight">{contract.clientName}</p>
                  {contract.company && <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{contract.company}</p>}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Muddat
                  </label>
                  <p className="text-base font-bold text-white">
                    {format(new Date(contract.startDate), "dd.MM.yyyy")} — {format(new Date(contract.endDate), "dd.MM.yyyy")}
                  </p>
                  {isExpired && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      <AlertCircle className="w-3 h-3" /> Muddat tugagan
                    </div>
                  )}
                </div>
              </div>

              {/* Total Amount */}
              <div className="pt-8 border-t border-slate-800/50 flex items-end justify-between">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /> Umumiy Summa
                  </label>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {new Intl.NumberFormat("uz-UZ").format(Number(contract.amount))}
                    </span>
                    <span className="text-sm font-black text-blue-500 uppercase tracking-widest">{contract.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 text-center">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] mb-4">SAYD.X DIGITAL SOLUTIONS ERP</p>
              <a href="https://saydx.uz" target="_blank" rel="noreferrer" className="text-blue-500/80 hover:text-blue-400 font-black text-xs tracking-widest uppercase transition-all hover:tracking-[0.4em]">saydx.uz</a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
