import React, { useState, useCallback, useEffect } from "react";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Settings, ShieldCheck, CheckCircle2, AlertOctagon, Maximize2, Minimize2, X, Download, Trash2, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { InvoiceSettingsForm } from "@/components/invoices/InvoiceSettingsForm";
import { InvoiceItemsDialog } from "@/components/invoices/InvoiceItemsDialog";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";

export default function Invoices() {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useInvoices();
  const { data: projects } = useProjects();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [isInvDialogOpen, setIsInvDialogOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [itemsDialogInvId, setItemsDialogInvId] = useState<number | null>(null);

  // Form states
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [projectIdForm, setProjectIdForm] = useState<number | "">("");
  const [dueDateForm, setDueDateForm] = useState("");
  const [paymentTermsForm, setPaymentTermsForm] = useState("");
  const [clientNameForm, setClientNameForm] = useState("");
  const [companyForm, setCompanyForm] = useState("");
  const [billToContactForm, setBillToContactForm] = useState("");
  const [contractPartnerForm, setContractPartnerForm] = useState("");
  const [contractStartDateForm, setContractStartDateForm] = useState("");
  const [contractEndDateForm, setContractEndDateForm] = useState("");
  const [formCurrency, setFormCurrency] = useState<"UZS" | "USD">("UZS");
  const [statusForm, setStatusForm] = useState<"paid" | "pending" | "unpaid">("pending");
  const [languageForm, setLanguageForm] = useState<"uz" | "en" | "ru">("uz");
  const [paidAmountForm, setPaidAmountForm] = useState<string>("0");
  const [vatRateForm, setVatRateForm] = useState<string>("0");
  const [discountRateForm, setDiscountRateForm] = useState<string>("0");
  const [verificationTokenForm, setVerificationTokenForm] = useState<string>("");
  const [invoiceRows, setInvoiceRows] = useState<any[]>([{ title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }]);

  // Verification states
  const [verifyInvoiceNumber, setVerifyInvoiceNumber] = useState("");
  const { data: verifiedInvoiceData, isLoading: isVerifying } = useQuery({
    queryKey: ["/api/invoices/verify", verifyInvoiceNumber],
    queryFn: async () => {
      if (verifyInvoiceNumber.length < 5) return null;
      const res = await fetch(`/api/invoices/verify/${verifyInvoiceNumber}`, { credentials: "include" });
      return res.json();
    },
    enabled: verifyInvoiceNumber.length > 5,
  });

  const resetForm = useCallback(() => {
    setEditingInvoiceId(null);
    setProjectIdForm("");
    setDueDateForm("");
    setPaymentTermsForm("");
    setClientNameForm("");
    setCompanyForm("");
    setBillToContactForm("");
    setContractPartnerForm("");
    setContractStartDateForm("");
    setContractEndDateForm("");
    setStatusForm("pending");
    setLanguageForm("uz");
    setPaidAmountForm("0");
    setVatRateForm("0");
    setDiscountRateForm("0");
    setVerificationTokenForm("");
    setInvoiceRows([{ title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }]);
  }, []);

  useEffect(() => {
    if (isInvDialogOpen && !editingInvoiceId) {
      // Yangi faktura uchun darhol vaqtinchalik xavfsiz token yaratish (preview uchun)
      const array = new Uint8Array(8);
      window.crypto.getRandomValues(array);
      const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      setVerificationTokenForm(token);

      fetch("/api/invoices/next-number", { credentials: "include" })
        .then(r => r.json())
        .then(d => setNextInvoiceNumber(d.invoiceNumber ?? ""))
        .catch(() => setNextInvoiceNumber(""));
    }
  }, [isInvDialogOpen, editingInvoiceId]);

  const handleEditInvoiceClick = useCallback(async (inv: any) => {
    setEditingInvoiceId(inv.id);
    setNextInvoiceNumber(inv.invoiceNumber);
    setProjectIdForm(inv.projectId || "");
    setDueDateForm(inv.dueDate ? format(new Date(inv.dueDate), "yyyy-MM-dd") : "");
    setPaymentTermsForm(inv.paymentTerms || "");
    setClientNameForm(inv.clientName || "");
    setCompanyForm(inv.company || "");
    setBillToContactForm(inv.billToContact || "");
    setContractPartnerForm(inv.contractPartner || "");
    setContractStartDateForm(inv.contractStartDate ? format(new Date(inv.contractStartDate), "yyyy-MM-dd") : "");
    setContractEndDateForm(inv.contractEndDate ? format(new Date(inv.contractEndDate), "yyyy-MM-dd") : "");
    setStatusForm(inv.status || "pending");
    setFormCurrency(inv.currency || "UZS");
    setLanguageForm(inv.language || "uz");
    setPaidAmountForm(inv.paidAmount || "0");
    setVatRateForm(inv.vatRate || "0");
    setDiscountRateForm(inv.discountRate || "0");
    setVerificationTokenForm(inv.verificationToken || "");

    try {
      const res = await fetch(`/api/invoices/${inv.id}/items`, { credentials: "include" });
      if (res.ok) {
        const items = await res.json();
        setInvoiceRows(items.length > 0 ? items.map((i: any) => ({
          ...i,
          startDate: i.startDate ? format(new Date(i.startDate), "yyyy-MM-dd") : undefined
        })) : [{ title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }]);
      }
    } catch (e) {
      console.error("Failed to fetch items", e);
    }
    setIsInvDialogOpen(true);
  }, []);

  const { data: invoiceSettings } = useQuery({
    queryKey: ["/api/settings/invoice"],
    queryFn: async () => {
      const res = await fetch("/api/settings/invoice", { credentials: "include" });
      return res.json();
    },
  });

  const [pdfGeneratingId, setPdfGeneratingId] = useState<number | null>(null);
  const handleDownloadPdf = async (inv: any) => {
    setPdfGeneratingId(inv.id);
    try {
      const response = await fetch(`/api/invoices/${inv.id}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ width: 750 })
      });
      if (!response.ok) throw new Error("PDF error");
      const { url } = await response.json();
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `${inv.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("PDF yuklanmadi");
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const totalFromRows = invoiceRows.reduce((s, r) => s + (Number(r.paidQuantity) || 1) * (Number(r.unitPrice) || 0), 0);
  const vatAmount = totalFromRows * (Number(vatRateForm) / 100);
  const discountAmount = totalFromRows * (Number(discountRateForm) / 100);
  const finalTotal = Math.max(0, totalFromRows + vatAmount - discountAmount - (Number(paidAmountForm) || 0));

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectIdForm) return alert("Loyihani tanlang");

    const invoiceData = {
      projectId: Number(projectIdForm),
      amount: String(totalFromRows),
      paidAmount: paidAmountForm,
      dueDate: new Date(dueDateForm),
      currency: formCurrency,
      status: statusForm,
      paymentTerms: paymentTermsForm || undefined,
      clientName: clientNameForm || undefined,
      company: companyForm || undefined,
      billToContact: billToContactForm || undefined,
      contractPartner: contractPartnerForm || undefined,
      contractStartDate: contractStartDateForm ? new Date(contractStartDateForm) : undefined,
      contractEndDate: contractEndDateForm ? new Date(contractEndDateForm) : undefined,
      language: languageForm,
      verificationToken: verificationTokenForm || undefined,
      vatRate: vatRateForm,
      discountRate: discountRateForm,
    };

    try {
      let invId = editingInvoiceId;
      if (editingInvoiceId) {
        await updateInvoice.mutateAsync({ id: editingInvoiceId, ...invoiceData });
      } else {
        const inv = await createInvoice.mutateAsync({ ...invoiceData, invoiceNumber: nextInvoiceNumber || "INV-AUTO" });
        invId = inv.id;
      }

      const items = invoiceRows.filter(r => r.title.trim()).map(r => ({
        ...r,
        quantity: Number(r.quantity) || 1,
        paidQuantity: Number(r.paidQuantity) || 1,
        unitPrice: String(r.unitPrice),
      }));

      if (items.length > 0 && invId) {
        await fetch(`/api/invoices/${invId}/items/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
          credentials: "include",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      resetForm();
      setIsInvDialogOpen(false);
    } catch (err: any) {
      alert(err.message || "Xato");
    }
  };

  if (isLoading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">Hisob-fakturalar</h1>
          <div className="flex items-center gap-3">
             <div className="h-1 w-12 bg-indigo-500 rounded-full" />
             <p className="text-white/40 font-medium text-sm">Mijozlarga yuboriladigan fakturalarni professional boshqarish.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-2xl shadow-2xl">
          <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 h-12 px-6 rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest transition-all">
                <ShieldCheck className="w-5 h-5 mr-2" /> Tekshirish
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 sm:max-w-md p-8 rounded-[3rem]">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight text-center">Fakturani tekshirish</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                   <p className="text-xs font-black text-white/40 uppercase tracking-widest">Faktura raqamini kiriting</p>
                   <Input value={verifyInvoiceNumber} onChange={e => setVerifyInvoiceNumber(e.target.value.toUpperCase())} placeholder="INV-..." className="glass-input h-14 text-center text-xl font-black tracking-widest" />
                </div>
                {verifiedInvoiceData?.invoice && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-500/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <ShieldCheck className="w-16 h-16 text-emerald-400" />
                    </div>
                    <p className="text-emerald-400 font-black uppercase tracking-[0.2em] mb-3 text-xs">HAQIQIY FAKTURA</p>
                    <div className="space-y-1">
                       <p className="text-white font-black text-lg">{verifiedInvoiceData.invoice.clientName}</p>
                       <p className="text-white/60 font-bold text-sm tracking-tight">
                         {new Intl.NumberFormat().format(verifiedInvoiceData.invoice.amount)} {verifiedInvoiceData.invoice.currency}
                       </p>
                    </div>
                  </motion.div>
                )}
                {verifiedInvoiceData?.notFound && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                     <p className="text-rose-400 font-black uppercase tracking-widest text-xs">Faktura topilmadi</p>
                  </motion.div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-8 w-px bg-white/10 mx-1" />

          <Button variant="ghost" onClick={() => setIsSettingsDialogOpen(true)} className="text-amber-400 w-12 h-12 rounded-xl hover:bg-amber-400/10 p-0">
            <Settings className="w-6 h-6" />
          </Button>
          
          <Button onClick={() => { resetForm(); setIsInvDialogOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white h-12 px-8 rounded-[1.25rem] font-black shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.05] active:scale-95 border-t border-white/20 uppercase text-[10px] tracking-widest">
            <Plus className="w-5 h-5 mr-2 stroke-[3px]" /> Yangi Qo'shish
          </Button>
        </div>
      </div>

      <Dialog open={isInvDialogOpen} onOpenChange={setIsInvDialogOpen}>
        <DialogContent className={`glass-panel border-white/10 p-0 flex flex-col overflow-hidden transition-all [&>button:last-child]:hidden ${isFullScreen ? 'w-screen h-screen max-w-none m-0 rounded-none' : 'w-[95vw] max-w-[1400px] h-[92vh] rounded-[3rem]'}`}>
          <DialogHeader className="h-20 border-b border-white/5 bg-black/60 relative flex flex-row items-center px-10">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="w-6 h-6" />
               </div>
               <DialogTitle className="text-xl font-black text-white tracking-widest uppercase">{editingInvoiceId ? "Hisob-fakturani tahrirlash" : "Yangi Hisob-faktura yaratish"}</DialogTitle>
            </div>
            
            {/* Unified Window Controls */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                className="h-10 w-10 text-white/20 hover:text-white hover:bg-white/5 rounded-2xl transition-all flex items-center justify-center border border-white/0 hover:border-white/5"
              >
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsInvDialogOpen(false)} 
                className="h-10 w-10 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all flex items-center justify-center border border-white/0 hover:border-rose-500/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-[42%] overflow-y-auto p-4 bg-black/40 custom-scrollbar">
              <form id="invoiceForm" onSubmit={handleSaveInvoice} className="space-y-6 pb-10">
                {/* 1. Meta data section - Grid layout */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-indigo-500/20" />
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Loyiha & Ma'lumotlar</span>
                    <div className="h-px flex-1 bg-indigo-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Faktura Raqami</label>
                      <Input readOnly value={nextInvoiceNumber} className="glass-input h-14 text-sm font-black bg-white/5 border-white/10 tracking-widest text-indigo-400" placeholder="Yuklanmoqda..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Loyiha (Project)</label>
                      <select value={projectIdForm} onChange={e => setProjectIdForm(e.target.value ? Number(e.target.value) : "")} required className="w-full glass-input h-14 px-4 rounded-xl bg-white/5 border-white/10 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                        <option value="" className="text-black">Loyiha tanlang...</option>
                        {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">To'lov muddati</label>
                      <Input type="date" required value={dueDateForm} onChange={e => setDueDateForm(e.target.value)} className="glass-input h-14 text-sm font-bold date-picker-white-icon" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Valyuta</label>
                      <select value={formCurrency} onChange={e => setFormCurrency(e.target.value as any)} className="w-full glass-input h-14 px-4 rounded-xl bg-white/5 border-white/10 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                        <option value="UZS" className="text-black">UZS (So'm)</option>
                        <option value="USD" className="text-black">USD (Dollar)</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Xolati (Status)</label>
                      <select value={statusForm} onChange={e => setStatusForm(e.target.value as any)} className="w-full glass-input h-14 px-4 rounded-xl bg-white/5 border-white/10 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all">
                        <option value="pending" className="text-black">Kutilmoqda</option>
                        <option value="paid" className="text-black">To'langan</option>
                        <option value="unpaid" className="text-black">To'lanmadi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Shartnoma section */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-blue-500/20" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Shartnoma bog'liqligi</span>
                    <div className="h-px flex-1 bg-blue-500/20" />
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-blue-500/10 rounded-[2rem] space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Shartnoma Hamkori</label>
                      <Input value={contractPartnerForm} onChange={e => setContractPartnerForm(e.target.value)} placeholder="Mijoz / Kompaniya nomi" className="glass-input h-14 text-sm font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Boshlanish sanasi</label>
                        <Input type="date" value={contractStartDateForm} onChange={e => setContractStartDateForm(e.target.value)} className="glass-input h-14 text-sm font-bold date-picker-white-icon" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Tugash sanasi</label>
                        <Input type="date" value={contractEndDateForm} onChange={e => setContractEndDateForm(e.target.value)} className="glass-input h-14 text-sm font-bold date-picker-white-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Kimga section */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-amber-500/20" />
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">Mijoz tafsilotlari</span>
                    <div className="h-px flex-1 bg-amber-500/20" />
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-amber-500/10 rounded-[2rem] space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Mijoz (Ism-sharif)</label>
                      <Input value={clientNameForm} onChange={e => setClientNameForm(e.target.value)} placeholder="Mijoz ismi" className="glass-input h-14 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Kompaniya nomi</label>
                      <Input value={companyForm} onChange={e => setCompanyForm(e.target.value)} placeholder="Kompaniya nomi" className="glass-input h-14 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/20 uppercase pl-1 tracking-widest">Aloqa manzili & Tel</label>
                      <Input value={billToContactForm} onChange={e => setBillToContactForm(e.target.value)} placeholder="Manzil, Tel, Email" className="glass-input h-14 text-sm font-bold" />
                    </div>
                  </div>
                </div>

                {/* 4. Xizmatlar section */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-rose-500/20" />
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em]">Xizmatlar & To'lovlar</span>
                    <div className="h-px flex-1 bg-rose-500/20" />
                    <div className="flex gap-2">
                       <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceRows(prev => [...prev, { title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }])} className="h-8 px-4 text-[10px] border-white/10 hover:bg-white/5 rounded-xl font-black uppercase tracking-widest transition-all">
                         <Plus className="w-3.5 h-3.5 mr-1" /> Qator
                       </Button>
                       <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceRows(prev => [...prev, { title: "Server", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "server", startDate: format(new Date(), "yyyy-MM-dd") }])} className="h-8 px-4 text-[10px] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 rounded-xl font-black uppercase tracking-widest transition-all">
                         <Plus className="w-3.5 h-3.5 mr-1" /> Server
                       </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {invoiceRows.map((row, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={i} 
                        className="group relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 transition-all hover:bg-white/[0.04] hover:border-white/10"
                      >
                        {/* Premium Delete Button */}
                        <button
                          type="button"
                          onClick={() => setInvoiceRows(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl opacity-0 group-hover:opacity-100 transition-all z-30 hover:bg-rose-600 hover:scale-110 active:scale-95 border-4 border-[#0a0c10]"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>

                        <div className="space-y-5">
                          <div className="grid grid-cols-12 gap-4 items-end">
                            {/* Xizmat nomi */}
                            <div className="col-span-6 space-y-2">
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-widest pl-1">Xizmat nomi</label>
                              <Input
                                value={row.title}
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                                placeholder="Xizmat nomi..."
                                className="glass-input h-12 text-sm font-bold bg-black/40 border-white/5 focus:border-indigo-500/30"
                              />
                            </div>

                            {/* Boshlanish */}
                            <div className="col-span-3 space-y-2">
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-widest pl-1">Boshlanish</label>
                              <Input
                                type="date"
                                value={row.startDate || ""}
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, startDate: e.target.value } : x))}
                                className="glass-input h-12 text-xs font-bold date-picker-white-icon bg-black/40 border-white/5"
                              />
                            </div>

                            {/* Narxi */}
                            <div className="col-span-3 space-y-2">
                              <label className="text-[9px] font-black text-white/20 uppercase tracking-widest pl-1 text-right w-full pr-1">Narxi</label>
                              <Input
                                type="number"
                                value={row.unitPrice}
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))}
                                placeholder="0"
                                className="glass-input h-12 text-sm text-right bg-black/40 border-white/5 font-black text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-4 items-center">
                            {/* Kuni / To'lov */}
                            <div className="col-span-12 flex items-center gap-6 bg-black/20 p-4 rounded-2xl border border-white/5">
                               <div className="flex-1 flex items-center gap-4">
                                  <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Kuni:</span>
                                  <Input
                                    type="number"
                                    value={row.quantity}
                                    onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))}
                                    className="glass-input h-10 w-20 text-center text-sm font-black border-transparent bg-white/5"
                                  />
                               </div>
                               <div className="w-px h-6 bg-white/5" />
                               <div className="flex-1 flex items-center gap-4">
                                  <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">To'lov:</span>
                                  <Input
                                    type="number"
                                    value={row.paidQuantity}
                                    onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, paidQuantity: e.target.value } : x))}
                                    className="glass-input h-10 w-20 text-center text-sm font-black border-transparent bg-indigo-500/10 text-indigo-400"
                                  />
                               </div>
                               <div className="flex-[2] flex items-center gap-3">
                                  <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">Loyiha:</span>
                                    <select
                                      value={row.projectId || ""}
                                      onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, projectId: e.target.value ? Number(e.target.value) : undefined } : x))}
                                      className="bg-transparent border-none text-xs text-indigo-400/60 font-bold focus:text-indigo-400 transition-colors cursor-pointer outline-none flex-1 truncate"
                                    >
                                      <option value="" className="text-black italic">Tanlanmagan...</option>
                                      {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                                    </select>
                               </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer total - Enhanced Typography */}
                <div className="pt-10 mt-10 border-t border-white/10 space-y-6 px-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/10 uppercase tracking-widest pl-1">Oldindan to'lov</label>
                       <div className="relative">
                          <Input 
                            type="number" 
                            value={paidAmountForm} 
                            onChange={e => setPaidAmountForm(e.target.value)}
                            className="glass-input h-12 text-right text-sm font-black pr-16 bg-white/5"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase">{formCurrency}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-white/10 uppercase tracking-widest pl-1">QQS & Chegirma</label>
                       <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input 
                              type="number" 
                              value={vatRateForm} 
                              onChange={e => setVatRateForm(e.target.value)}
                              className="glass-input h-12 text-center text-sm font-black bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
                              placeholder="QQS %"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500/20">%</span>
                          </div>
                          <div className="relative flex-1">
                            <Input 
                              type="number" 
                              value={discountRateForm} 
                              onChange={e => setDiscountRateForm(e.target.value)}
                              className="glass-input h-12 text-center text-sm font-black bg-rose-500/5 text-rose-400 border-rose-500/10"
                              placeholder="Dis %"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-500/20">%</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-500 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 flex flex-col items-center gap-2 relative overflow-hidden group/total mt-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] relative z-10">Jami Hisob-faktura Summasi</span>
                    <div className="flex items-baseline gap-3 relative z-10">
                      <span className="text-sm font-black text-white/30 uppercase tracking-widest">{formCurrency}</span>
                      <span className="text-5xl font-black text-white tracking-tighter leading-none transition-all group-hover/total:scale-110">
                        {new Intl.NumberFormat().format(finalTotal)}
                      </span>
                    </div>
                    <div className="absolute -bottom-6 -right-6 pointer-events-none opacity-10">
                       <FileText className="w-32 h-32 text-white" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="w-[58%] bg-[#0a0c10] p-10 overflow-y-auto flex justify-center items-start custom-scrollbar relative">
               {/* Background Watermark/Pattern */}
               <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                  <div className="text-[200px] font-black tracking-widest uppercase rotate-[-35deg] whitespace-nowrap">SAYD.X PREVIEW</div>
               </div>

              {invoiceSettings && (
                <div className="relative z-10 scale-[0.95] origin-top">
                  <InvoicePreview
                    language={languageForm}
                    invoiceNumber={nextInvoiceNumber}
                    status={statusForm}
                    dueDate={dueDateForm}
                    currency={formCurrency}
                    clientName={clientNameForm}
                    company={companyForm}
                    billToContact={billToContactForm}
                    projectName={projects?.find(p => p.id === Number(projectIdForm))?.name || ""}
                    contractPartner={contractPartnerForm}
                    contractStartDate={contractStartDateForm}
                    contractEndDate={contractEndDateForm}
                    invoiceRows={invoiceRows}
                    totalFromRows={totalFromRows}
                    paidAmount={paidAmountForm}
                    vatRate={vatRateForm}
                    discountRate={discountRateForm}
                    verificationToken={verificationTokenForm}
                    settings={invoiceSettings}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="h-24 px-10 border-t border-white/10 flex items-center justify-end gap-5 bg-black/80 backdrop-blur-xl">
            <Button variant="outline" onClick={() => setIsInvDialogOpen(false)} className="h-14 px-10 rounded-2xl border-white/10 text-white font-black hover:bg-white/5 uppercase text-xs tracking-widest">Bekor qilish</Button>
            <Button form="invoiceForm" type="submit" disabled={createInvoice.isPending || updateInvoice.isPending} className="h-14 px-14 rounded-2xl bg-indigo-500 text-white font-black shadow-2xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 uppercase text-xs tracking-[0.2em]">
               {createInvoice.isPending || updateInvoice.isPending ? "Saqlanmoqda..." : "Saqlash va Tasdiqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass-panel border-white/10 w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-white mb-4">PDF Preview</DialogTitle>
          {invoiceSettings && (
            <div className="flex justify-center">
              <InvoicePreview
                language={languageForm}
                invoiceNumber="INV-DEMO"
                status="pending"
                dueDate=""
                currency="UZS"
                clientName="Mijoz nomi"
                company="Kompaniya"
                billToContact="Manzil..."
                projectName="Demo Loyiha"
                invoiceRows={[{ title: "Demo xizmat", quantity: 1, paidQuantity: 1, unitPrice: "1000000" }]}
                totalFromRows={1000000}
                settings={invoiceSettings}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="glass-panel border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-white">Sozlamalar</DialogTitle></DialogHeader>
          <InvoiceSettingsForm initial={invoiceSettings} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ["/api/settings/invoice"] }); setIsSettingsDialogOpen(false); }} />
        </DialogContent>
      </Dialog>

      <InvoiceItemsDialog invId={itemsDialogInvId} onClose={() => setItemsDialogInvId(null)} projects={projects} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {invoices?.map((inv, idx) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              projectName={projects?.find(p => p.id === inv.projectId)?.name}
              idx={idx}
              onEdit={handleEditInvoiceClick}
              onDelete={id => window.confirm("O'chirishni xohlaysizmi?") && deleteInvoice.mutate(id)}
              onAddItems={id => setItemsDialogInvId(id)}
              onDownloadPdf={handleDownloadPdf}
              onStatusChange={(id, status) => updateInvoice.mutate({ id, status }, {
                onError: (err: any) => alert("Xatolik: " + (err.message || "Statusni yangilab bo'lmadi")),
                onSuccess: () => {
                  // Optional: Refresh PDF generating ID if we want to show loading
                }
              })}
              pdfGeneratingId={pdfGeneratingId}
            />
          ))}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
