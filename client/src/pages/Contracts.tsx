import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollText, Plus, Trash2, Calendar, DollarSign, User, Briefcase, FileText, Globe, UserCheck, CreditCard, ShieldCheck, Settings, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useContracts } from "@/hooks/use-contracts";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useEmployees } from "@/hooks/use-employees";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InvoiceSettingsForm } from "@/components/invoices/InvoiceSettingsForm";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ContractPreview } from "@/components/contracts/ContractPreview";

export default function Contracts() {
  const { contracts, isLoading, createContract, updateContract, deleteContract } = useContracts();
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedContractForPreview, setSelectedContractForPreview] = useState<any>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifiedContract, setVerifiedContract] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-fetch next contract number
  useEffect(() => {
    if (isOpen) {
      fetch("/api/contracts/next-number")
        .then(res => res.json())
        .then(data => {
          if (data.contractNumber) {
            // We can't easily auto-set the form input since it's uncontrolled or using FormData
            // But we can set a state to use it as a default value
            setAutoNumber(data.contractNumber);
          }
        });
    }
  }, [isOpen]);

  const [autoNumber, setAutoNumber] = useState("");

  const handleVerify = async () => {
    if (!verifyNumber) return;
    setIsVerifying(true);
    setVerifiedContract(null);
    try {
      const res = await fetch(`/api/contracts/verify/${encodeURIComponent(verifyNumber)}`);
      const data = await res.json();
      if (data.notFound) {
        setVerifiedContract({ notFound: true });
      } else {
        setVerifiedContract(data.contract);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const { data: invoiceSettings } = useQuery({
    queryKey: ["/api/settings/invoice"],
    queryFn: async () => {
      const res = await fetch("/api/settings/invoice", { credentials: "include" });
      return res.json();
    },
  });

  // Form states for calculations
  const [amount, setAmount] = useState<string>("0");
  const [advance, setAdvance] = useState<string>("0");
  
  // File upload state for TZ
  const [tzUrl, setTzUrl] = useState<string | null>(null);
  const { getUploadParameters } = useUpload();

  const remaining = useMemo(() => {
    const total = parseFloat(amount) || 0;
    const adv = parseFloat(advance) || 0;
    return Math.max(0, total - adv).toString();
  }, [amount, advance]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const getVal = (name: string) => {
      const v = fd.get(name) as string;
      return v && v.trim() !== "" ? v : null;
    };

    const data = {
      contractNumber: fd.get("contractNumber") as string,
      clientId: fd.get("clientId") ? Number(fd.get("clientId")) : null,
      projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
      amount: amount,
      advancePayment: advance,
      remainingAmount: remaining,
      currency: (fd.get("currency") as string) || "UZS",
      startDate: new Date(fd.get("startDate") as string),
      endDate: new Date(fd.get("endDate") as string),
      workMethod: getVal("workMethod"),
      contractType: getVal("contractType"),
      technicalAssignmentUrl: tzUrl,
      assignedEmployeeId: getVal("assignedEmployeeId"),
      paymentType: getVal("paymentType"),
      description: getVal("description"),
      title: getVal("contractType") || fd.get("contractNumber") as string,
      clientAddress: getVal("clientAddress"),
      clientPhone: getVal("clientPhone"),
      clientBankName: getVal("clientBankName"),
      clientMfo: getVal("clientMfo"),
      clientInn: getVal("clientInn"),
      clientAccountNumber: getVal("clientAccountNumber"),
      // Offer fields
      workSchedule: getVal("workSchedule"),
      managerPhone: getVal("managerPhone"),
      clickDetails: getVal("clickDetails"),
      issueContact: getVal("issueContact"),
      projectDurationInfo: getVal("projectDurationInfo"),
      proposedServices: getVal("proposedServices"),
      advantages: getVal("advantages"),
      status: "active",
    };

    try {
      await createContract.mutateAsync(data as any);
      setIsOpen(false);
      setAmount("0");
      setAdvance("0");
      setTzUrl(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownloadPdf = async (contract: any) => {
    setIsPdfLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contract.id}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "PDF generatsiya qilishda xatolik");
      }
      
      const { url } = await response.json();
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `SHARTNOMA-${contract.contractNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert(`PDF yuklanmadi: ${e.message}`);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContract) return;
    const fd = new FormData(e.currentTarget);
    const getVal = (name: string) => {
      const v = fd.get(name) as string;
      return v && v.trim() !== "" ? v : null;
    };
    const data = {
      contractNumber: fd.get("contractNumber") as string,
      clientId: fd.get("clientId") ? Number(fd.get("clientId")) : null,
      projectId: fd.get("projectId") ? Number(fd.get("projectId")) : null,
      amount: amount,
      advancePayment: advance,
      remainingAmount: remaining,
      currency: (fd.get("currency") as string) || "UZS",
      startDate: new Date(fd.get("startDate") as string),
      endDate: new Date(fd.get("endDate") as string),
      workMethod: getVal("workMethod"),
      contractType: getVal("contractType"),
      technicalAssignmentUrl: tzUrl,
      assignedEmployeeId: getVal("assignedEmployeeId"),
      paymentType: getVal("paymentType"),
      description: getVal("description"),
      clientAddress: getVal("clientAddress"),
      clientPhone: getVal("clientPhone"),
      clientBankName: getVal("clientBankName"),
      clientMfo: getVal("clientMfo"),
      clientInn: getVal("clientInn"),
      clientAccountNumber: getVal("clientAccountNumber"),
      // Offer fields
      workSchedule: getVal("workSchedule"),
      managerPhone: getVal("managerPhone"),
      clickDetails: getVal("clickDetails"),
      issueContact: getVal("issueContact"),
      projectDurationInfo: getVal("projectDurationInfo"),
      proposedServices: getVal("proposedServices"),
      advantages: getVal("advantages"),
    };
    try {
      await updateContract.mutateAsync({ id: selectedContract.id, contract: data as any });
      setIsEditOpen(false);
      setSelectedContract(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Haqiqatan ham ushbu shartnomani o'chirmoqchimisiz?")) {
      await deleteContract.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Shartnomalar yuklanmoqda..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative mb-12 overflow-hidden py-8 px-2">
        {/* Background Watermark */}
        <div className="absolute -top-10 -left-10 text-[12rem] font-black text-white/[0.03] select-none pointer-events-none tracking-tighter uppercase italic">
          Contracts
        </div>
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-1 bg-indigo-500 w-12 rounded-full" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Hujjatlar Markazi</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-5xl md:text-6xl font-display font-black text-white tracking-tighter leading-none">
                Shartnomalar
              </h1>
              <div className="px-4 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
                <span className="text-sm font-black text-indigo-400">
                  {contracts.filter(c => c.status === "active").length} FAOL
                </span>
              </div>
            </div>
            <p className="text-white/40 font-medium text-lg max-w-xl leading-relaxed">
              Mijozlar bilan tuzilgan barcha rasmiy kelishuvlar, texnik topshiriqlar va moliyaviy shartnomalar jamlangan markaz.
            </p>
          </motion.div>
          
          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-2 bg-white/[0.03] border border-white/5 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl"
            >
               {/* Verify Dialog */}
               <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 h-14 px-6 rounded-[1.75rem] transition-all hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95 font-black uppercase text-xs tracking-widest">
                    <ShieldCheck className="w-5 h-5 mr-3" /> Tekshirish
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-white/10 sm:max-w-md p-0 overflow-hidden rounded-[2.5rem]">
                  <div className="p-8 bg-slate-900 border-b border-white/10 text-center relative">
                    <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500/50" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Shartnomani tekshirish</h2>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Shartnoma Raqami</label>
                       <div className="flex gap-2">
                         <Input 
                          value={verifyNumber} 
                          onChange={e => setVerifyNumber(e.target.value.toUpperCase())} 
                          placeholder="SH-..." 
                          className="glass-input h-14 text-center text-lg font-black tracking-widest border-emerald-500/20 focus:border-emerald-500/50 w-full" 
                        />
                        <Button 
                          onClick={handleVerify}
                          disabled={isVerifying || !verifyNumber}
                          className="h-14 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl active:scale-95 transition-all shrink-0"
                        >
                          {isVerifying ? <LoadingSpinner /> : "OK"}
                        </Button>
                       </div>
                    </div>

                    {verifiedContract && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl border ${verifiedContract.notFound ? 'bg-destructive/10 border-destructive/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}
                      >
                        {verifiedContract.notFound ? (
                          <div className="text-center text-destructive font-bold py-2">
                            Shartnoma topilmadi!
                          </div>
                        ) : (
                          <div className="space-y-2">
                             <div className="flex justify-between text-xs">
                               <span className="text-white/40 font-bold uppercase">Raqam:</span>
                               <span className="text-white font-black">{verifiedContract.contractNumber}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                               <span className="text-white/40 font-bold uppercase">Summa:</span>
                               <span className="text-white font-black">{Number(verifiedContract.amount).toLocaleString()} {verifiedContract.currency}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                               <span className="text-white/40 font-bold uppercase">Sana:</span>
                               <span className="text-white font-black">{format(new Date(verifiedContract.createdAt), "dd.MM.yyyy")}</span>
                             </div>
                             <div className="mt-2 text-[10px] text-emerald-400 font-black text-center uppercase tracking-widest bg-emerald-400/10 py-1 rounded-lg">
                               <ShieldCheck className="w-3 h-3 inline mr-1" /> Rasmiy Tasdiqlangan
                             </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <p className="text-white/40 text-[10px] text-center font-medium leading-relaxed">
                      Eslatma: Bu bo'lim faqat SAYD.X LLC tomonidan taqdim etilgan rasmiy shartnomalarni tekshirish uchun.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="h-8 w-px bg-white/10 mx-1" />

              {/* Settings Button */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-amber-400 w-14 h-14 rounded-[1.5rem] hover:bg-amber-400/10 hover:scale-110 active:scale-90 transition-all p-0">
                    <Settings className="w-6 h-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-white/10 max-h-[90vh] overflow-y-auto rounded-[3rem] p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Rekvizitlar Sozlamalari</DialogTitle>
                  </DialogHeader>
                  {invoiceSettings && (
                    <InvoiceSettingsForm 
                      initial={invoiceSettings} 
                      onSuccess={() => { 
                        queryClient.invalidateQueries({ queryKey: ["/api/settings/invoice"] }); 
                        setIsSettingsOpen(false); 
                      }} 
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* New Contract Dialog */}
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-500 hover:bg-indigo-600 text-white h-14 px-10 rounded-[1.75rem] font-black shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] active:scale-95 border-t border-white/20 uppercase text-xs tracking-[0.1em]">
                    <Plus className="w-6 h-6 mr-3 stroke-[3px]" /> Yangi Qo'shish
                  </Button>
                </DialogTrigger>
              <DialogContent className="glass-panel border-white/10 max-w-3xl overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar rounded-[3rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  Yangi shartnoma yaratish
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6 relative pb-4">
                {/* Row 1: Shartnoma Raqami | Ish olish Tartibi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Shartnoma Raqami</label>
                    <Input name="contractNumber" required value={autoNumber} onChange={e => setAutoNumber(e.target.value)} placeholder="Masalan: SH-2026/001" className="glass-input h-12 text-white font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Ish olish tartibi</label>
                    <div className="flex gap-2">
                      <select name="workMethod" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                        <option value="offline" className="text-black">Offline</option>
                        <option value="online" className="text-black">Online</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 2: Mijoz / Kompaniya */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Mijoz / Kompaniya tanlang</label>
                    <select name="clientId" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="" className="text-black">Mijozni tanlang</option>
                      {clients?.map((c) => (
                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Loyiha</label>
                    <select name="projectId" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="" className="text-black">Loyihani tanlang</option>
                      {projects?.filter(p => !p.status || p.status !== "completed").map((p) => (
                        <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Umumiy summa | Oldindan to'lov | Qolgan summa */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Umumiy summa</label>
                    <div className="relative">
                      <Input 
                        name="amount" 
                        type="number" 
                        required 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0" 
                        className="glass-input h-12 text-white font-bold pr-16" 
                      />
                      <select name="currency" className="absolute right-2 top-2 h-8 rounded-lg bg-white/10 border-0 text-white text-xs font-black outline-none px-2">
                        <option value="UZS">UZS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Oldindan to'lov</label>
                    <Input 
                      name="advancePayment" 
                      type="number" 
                      value={advance}
                      onChange={(e) => setAdvance(e.target.value)}
                      placeholder="0" 
                      className="glass-input h-12 text-white font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Qolgan summa</label>
                    <div className="h-12 flex items-center px-4 rounded-xl border border-white/10 bg-white/5 text-primary/80 font-black">
                      {parseFloat(remaining).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Row 5: Boshlanish sana | Tugash sana */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Boshlanish sana</label>
                    <Input name="startDate" type="date" required className="glass-input h-12 text-white font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Tugash sana</label>
                    <Input name="endDate" type="date" required className="glass-input h-12 text-white font-bold" />
                  </div>
                </div>

                {/* Row 6: Turi | TZ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Turi</label>
                    <Input name="contractType" placeholder="Shartnoma turi..." className="glass-input h-12 text-white font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">TZ (Texnik topshiriq)</label>
                    <div className="flex gap-2">
                      <ObjectUploader
                        onGetUploadParameters={getUploadParameters}
                        onComplete={(result) => {
                          const file = result?.successful?.[0];
                          if (file) {
                             // result.successful[0].uploadURL is the URL, but ObjectUploader usually stores paths in a way that serving can use.
                             // use-upload request-url returns objectPath which is what we want.
                             // Uppy results contain response.body or meta.
                             // Looking at hook: uploadResponse returns objectPath.
                             // In ObjectUploader, results successful elements have response.body
                             setTzUrl((file.response?.body as any)?.objectPath || "");
                          }
                        }}
                        buttonClassName="w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white/50 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        {tzUrl ? <span className="text-primary tracking-tighter truncate max-w-[150px]">{tzUrl.split('/').pop()}</span> : <><Plus className="w-4 h-4" /> TZ yuklash</>}
                      </ObjectUploader>
                      {tzUrl && (
                        <Button type="button" variant="ghost" onClick={() => setTzUrl(null)} className="h-12 w-12 rounded-xl border border-white/10 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 7: Biriktirilgan xodim | To'lov turi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Biriktirilgan xodim</label>
                    <select name="assignedEmployeeId" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="" className="text-black">Xodimni tanlang</option>
                      {employees?.map((e) => (
                        <option key={e.id} value={e.id} className="text-black">{e.firstName} {e.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">To'lov turi</label>
                    <select name="paymentType" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="cash" className="text-black">Naqd</option>
                      <option value="card" className="text-black">Karta</option>
                      <option value="transfer" className="text-black">O'tkazma</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-500/20">
                  <label className="text-xs font-black uppercase tracking-widest text-indigo-400 ml-1">OFFER Ma'lumotlari (Qo'shimcha kelishuv uchun)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ish grafigi</label>
                       <Input name="workSchedule" defaultValue="Dushanbadan yakshanbagacha, soat 10:00 dan 22:00 gacha" className="glass-input h-11 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Menedjer telfon raqami</label>
                       <Input name="managerPhone" defaultValue="20-000-37-90" className="glass-input h-11 text-sm font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Click orqali to'lov (Karta)</label>
                       <Input name="clickDetails" defaultValue="5614 6821 2364 5204 SAIDMUHAMMADALIXON ATAULLAYEV" className="glass-input h-11 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Muammoli holatda bog'lanish</label>
                       <Input name="issueContact" defaultValue="Kompaniya ta`sischisi Ataullayev Saidmuhammadalixon 20-000-37-90" className="glass-input h-11 text-sm font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Loyiha tugallanishi uchun ketadigan vaqt</label>
                     <Input name="projectDurationInfo" defaultValue="45 kun (+ - 10)" className="glass-input h-11 text-sm font-bold" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Taklif qilinayotgan xizmatlar</label>
                       <textarea name="proposedServices" defaultValue="Qog'ozda ishlaydigan holatni avtomatlashtirish, Doimiy qo'llab-quvvatlash, Moliyaviy xolatingizni yaxshilash uchun, Sayt va Telegram botlar yaratish hamda avtomatlashtirish, Sayt va Botlarda to'lov tizimlarini integratsiyalash" rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Xizmatning afzalliklari</label>
                       <textarea name="advantages" defaultValue="Har bir mijoz va sohaga mos yondashuv, Eng yangi texnologiyalar asosida xizmat, Oson foydalanish, Avtomatlashtirish va integratsiya, 24/7 texnik yordam" rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-1">Mijozning qo'shimcha ma'lumotlari (PDF uchun)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Manzil</label>
                       <Input name="clientAddress" placeholder="Manzil..." className="glass-input h-11 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Telefon</label>
                       <Input name="clientPhone" placeholder="+998..." className="glass-input h-11 text-sm font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Bank nomi</label>
                       <Input name="clientBankName" placeholder="Bank nomi..." className="glass-input h-11 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">H/r (Hisob raqami)</label>
                       <Input name="clientAccountNumber" placeholder="202..." className="glass-input h-11 text-sm font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">MFO</label>
                       <Input name="clientMfo" placeholder="00444" className="glass-input h-11 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">STIR (INN)</label>
                       <Input name="clientInn" placeholder="123456789" className="glass-input h-11 text-sm font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Qo'shimcha tafsilotlar</label>
                  <textarea name="description" rows={3} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" placeholder="Shartnoma bo'yicha ixtiyoriy izoh..." />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl border-white/10 text-white font-black hover:bg-white/5">
                    Bekor qilish
                  </Button>
                  <Button type="submit" disabled={createContract.isPending} className="flex-[2] h-14 rounded-2xl bg-secondary text-white font-black shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all active:scale-95">
                    {createContract.isPending ? <LoadingSpinner /> : "Saqlash"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>
      )}
      </div>
    </div>

      {contracts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[3rem] p-16 border border-white/5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <ScrollText className="w-12 h-12 text-primary relative" />
          </div>
          <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Shartnomalar mavjud emas</h3>
          <p className="text-white/40 max-w-md mx-auto mb-10 text-lg font-medium leading-relaxed">
            Hozircha tizimda hech qanday shartnoma mavjud emas. Birinchi shartnomani qo'shish uchun yuqoridagi tugmani bosing.
          </p>
          {isAdmin && (
            <Button onClick={() => setIsOpen(true)} variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-background px-10 rounded-2xl font-black h-12">
              Boshlash
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {contracts.map((contract, index) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="relative group block"
              >
                {/* Contract "Sheet" Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative glass-panel rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col md:flex-row h-full min-h-[300px]">
                  {/* Left Accent Bar */}
                  <div className={`w-2 md:w-3 h-full shrink-0 ${contract.status === "active" ? "bg-emerald-500/80" : "bg-white/20"}`} />
                  
                  {/* Main Content Area */}
                  <div className="flex-1 p-8 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500">
                          <ScrollText className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60 mb-1">SHARTNOMA RAQAMI</p>
                          <h3 className="text-2xl font-black text-white tracking-tight">{contract.contractNumber}</h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContract(contract);
                                setAmount(contract.amount);
                                setAdvance(contract.advancePayment || "0");
                                setTzUrl(contract.technicalAssignmentUrl);
                                setIsEditOpen(true);
                              }}
                              className="h-10 w-10 text-white/40 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl"
                            >
                              <Pencil className="w-4.5 h-4.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleDelete(e, contract.id)}
                              className="h-10 w-10 text-white/40 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 mt-2">
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                              <User className="w-4 h-4 text-white/40" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Mijoz</p>
                              <p className="text-sm font-bold text-white/80 truncate leading-tight">
                                {clients?.find(c => c.id === contract.clientId)?.name || "Noma'lum Mijoz"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                              <Briefcase className="w-4 h-4 text-white/40" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Loyiha</p>
                              <p className="text-sm font-bold text-white/80 truncate leading-tight">
                                {projects?.find(p => p.id === contract.projectId)?.name || "Loyiha biriktirilmagan"}
                              </p>
                            </div>
                          </div>
                       </div>
                       
                       <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                              <Calendar className="w-4 h-4 text-white/40" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Muddat</p>
                              <p className="text-sm font-bold text-indigo-300 italic">
                                {format(new Date(contract.startDate), "dd MMM", { locale: uz })} — {format(new Date(contract.endDate), "dd MMM", { locale: uz })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-lg">
                              <Globe className="w-4 h-4 text-white/40" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Tartib</p>
                              <p className="text-sm font-bold text-white/80 capitalize">{contract.workMethod || "Offline"}</p>
                            </div>
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white tracking-tighter">
                          {Number(contract.amount).toLocaleString()}
                        </span>
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{contract.currency}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => {
                            setSelectedContractForPreview(contract);
                            setIsPreviewOpen(true);
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white font-bold px-5 h-11 rounded-xl transition-all border border-white/5"
                        >
                          <FileText className="w-4 h-4 mr-2 text-indigo-400" /> Preview
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Right Side Meta (Optional creative element) */}
                  <div className="hidden md:flex flex-col items-center justify-center px-6 bg-white/[0.02] border-l border-white/5 shrink-0">
                     <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black tracking-[0.5em] text-white/10 uppercase mb-8">
                       OFFICIAL DOCUMENT
                     </div>
                     <div className={`w-3 h-3 rounded-full ${contract.status === "active" ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-white/20"}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-panel border-white/10 w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-[3rem]">
          <DialogTitle className="text-3xl font-black text-white mb-8 pr-12 tracking-tight uppercase">
            Shartnomani tahrirlash
          </DialogTitle>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Shartnoma №</label>
                <Input name="contractNumber" defaultValue={selectedContract?.contractNumber} required className="glass-input h-12 text-white font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Mijoz</label>
                <select name="clientId" defaultValue={selectedContract?.clientId} className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                  <option value="" className="text-black">Mijozni tanlang</option>
                  {clients?.map((cl) => (
                    <option key={cl.id} value={cl.id} className="text-black">{cl.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Loyiha</label>
              <select name="projectId" defaultValue={selectedContract?.projectId} className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                <option value="" className="text-black">Loyihani tanlang</option>
                {projects?.map((pj) => (
                  <option key={pj.id} value={pj.id} className="text-black">{pj.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Summa</label>
                <div className="relative">
                  <Input 
                    name="amount" 
                    type="number" 
                    required 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input h-12 text-white font-bold pr-16" 
                  />
                  <select name="currency" defaultValue={selectedContract?.currency} className="absolute right-2 top-2 h-8 rounded-lg bg-white/10 border-0 text-white text-xs font-black outline-none px-2">
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Oldindan to'lov</label>
                <Input 
                  name="advancePayment" 
                  type="number" 
                  value={advance}
                  onChange={(e) => setAdvance(e.target.value)}
                  className="glass-input h-12 text-white font-bold" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Qolgan summa</label>
                <div className="h-12 flex items-center px-4 rounded-xl border border-white/10 bg-white/5 text-primary/80 font-black">
                  {parseFloat(remaining).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Boshlanish sana</label>
                <Input name="startDate" type="date" defaultValue={selectedContract?.startDate ? new Date(selectedContract.startDate).toISOString().split('T')[0] : ""} required className="glass-input h-12 text-white font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Tugash sana</label>
                <Input name="endDate" type="date" defaultValue={selectedContract?.endDate ? new Date(selectedContract.endDate).toISOString().split('T')[0] : ""} required className="glass-input h-12 text-white font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Ish tartibi</label>
                <select name="workMethod" defaultValue={selectedContract?.workMethod || "offline"} className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                  <option value="online" className="text-black">Online</option>
                  <option value="offline" className="text-black">Offline</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">To'lov turi</label>
                <select name="paymentType" defaultValue={selectedContract?.paymentType || "cash"} className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                  <option value="cash" className="text-black">Naqd</option>
                  <option value="card" className="text-black">Karta</option>
                  <option value="transfer" className="text-black">O'tkazma</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-indigo-500/20">
              <label className="text-xs font-black uppercase tracking-widest text-indigo-400 ml-1">OFFER Ma'lumotlari</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ish grafigi</label>
                   <Input name="workSchedule" defaultValue={selectedContract?.workSchedule} className="glass-input h-11 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Menedjer telfon raqami</label>
                   <Input name="managerPhone" defaultValue={selectedContract?.managerPhone} className="glass-input h-11 text-sm font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Click orqali to'lov (Karta)</label>
                   <Input name="clickDetails" defaultValue={selectedContract?.clickDetails} className="glass-input h-11 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Muammoli holatda bog'lanish</label>
                   <Input name="issueContact" defaultValue={selectedContract?.issueContact} className="glass-input h-11 text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Loyiha tugallanishi uchun ketadigan vaqt</label>
                 <Input name="projectDurationInfo" defaultValue={selectedContract?.projectDurationInfo} className="glass-input h-11 text-sm font-bold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Taklif qilinayotgan xizmatlar</label>
                   <textarea name="proposedServices" defaultValue={selectedContract?.proposedServices} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Xizmatning afzalliklari</label>
                   <textarea name="advantages" defaultValue={selectedContract?.advantages} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <label className="text-xs font-black uppercase tracking-widest text-primary/60 ml-1">Mijozning qo'shimcha ma'lumotlari (PDF uchun)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Manzil</label>
                   <Input name="clientAddress" defaultValue={selectedContract?.clientAddress} className="glass-input h-11 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Telefon</label>
                   <Input name="clientPhone" defaultValue={selectedContract?.clientPhone} className="glass-input h-11 text-sm font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Bank nomi</label>
                   <Input name="clientBankName" defaultValue={selectedContract?.clientBankName} className="glass-input h-11 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">H/r</label>
                   <Input name="clientAccountNumber" defaultValue={selectedContract?.clientAccountNumber} className="glass-input h-11 text-sm font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">MFO</label>
                   <Input name="clientMfo" defaultValue={selectedContract?.clientMfo} className="glass-input h-11 text-sm font-bold" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">STIR (INN)</label>
                   <Input name="clientInn" defaultValue={selectedContract?.clientInn} className="glass-input h-11 text-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Qo'shimcha tafsilotlar</label>
              <textarea name="description" defaultValue={selectedContract?.description} rows={3} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" placeholder="Izoh..." />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-14 rounded-2xl border-white/10 text-white font-black hover:bg-white/5">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={updateContract.isPending} className="flex-[2] h-14 rounded-2xl bg-amber-500 text-white font-black hover:bg-amber-600 transition-all active:scale-95">
                {updateContract.isPending ? <LoadingSpinner /> : "Yangilash"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass-panel border-white/10 w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 p-4 flex justify-between items-center">
            <h2 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Shartnoma Preview
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => selectedContractForPreview && handleDownloadPdf(selectedContractForPreview)} 
                disabled={isPdfLoading}
                className="bg-secondary text-white font-bold h-9 px-4 rounded-lg flex items-center gap-2"
              >
                {isPdfLoading ? <LoadingSpinner /> : <><Download className="w-4 h-4" /> PDF Yuklash</>}
              </Button>
            </div>
          </div>
          <div className="p-8 bg-slate-100/10">
            {selectedContractForPreview && (
              <ContractPreview 
                contract={selectedContractForPreview} 
                settings={invoiceSettings}
                client={clients?.find(c => c.id === selectedContractForPreview.clientId)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
