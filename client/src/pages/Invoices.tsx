import React, { useState, useCallback, useEffect } from "react";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Settings, ShieldCheck, CheckCircle2, AlertOctagon, Maximize2, Minimize2, X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    setInvoiceRows([{ title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }]);
  }, []);

  useEffect(() => {
    if (isInvDialogOpen && !editingInvoiceId) {
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

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectIdForm) return alert("Loyihani tanlang");

    const invoiceData = {
      projectId: Number(projectIdForm),
      amount: String(totalFromRows),
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Hisob-fakturalar</h1>
          <p className="text-muted-foreground">Mijozlarga yuboriladigan fakturalarni boshqarish.</p>
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl">
          <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 h-11 px-5 rounded-xl">
                <ShieldCheck className="w-5 h-5 mr-2" /> Tekshirish
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 sm:max-w-md p-0 overflow-hidden">
              <div className="p-6 bg-slate-900 border-b border-white/10 text-center">
                <DialogTitle className="text-white">Fakturani tekshirish</DialogTitle>
              </div>
              <div className="p-6 space-y-4">
                <Input value={verifyInvoiceNumber} onChange={e => setVerifyInvoiceNumber(e.target.value.toUpperCase())} placeholder="INV-..." className="glass-input" />
                {verifiedInvoiceData?.invoice && (
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400 font-bold">HAQIQIY FAKTURA</p>
                    <p className="text-white text-sm mt-1">{verifiedInvoiceData.invoice.clientName} - {new Intl.NumberFormat().format(verifiedInvoiceData.invoice.amount)} {verifiedInvoiceData.invoice.currency}</p>
                  </div>
                )}
                {verifiedInvoiceData?.notFound && <p className="text-red-400 text-center">Topilmadi</p>}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" onClick={() => setIsPreviewOpen(true)} className="text-blue-400 h-11 px-4"><FileText className="w-5 h-5" /></Button>
          <Button variant="ghost" onClick={() => setIsSettingsDialogOpen(true)} className="text-amber-400 h-11 px-4"><Settings className="w-5 h-5" /></Button>
          <Button onClick={() => { resetForm(); setIsInvDialogOpen(true); }} className="bg-blue-600 h-11 px-8 rounded-xl font-bold"><Plus className="w-5 h-5 mr-2" /> Yangi</Button>
        </div>
      </div>

      <Dialog open={isInvDialogOpen} onOpenChange={setIsInvDialogOpen}>
        <DialogContent className={`glass-panel border-white/10 p-0 flex flex-col overflow-hidden transition-all ${isFullScreen ? 'w-screen h-screen max-w-none m-0 rounded-none' : 'w-[95vw] max-w-7xl h-[90vh]'}`}>
          <DialogHeader className="p-5 border-b border-white/5 bg-black/60 relative flex flex-row items-center">
            <DialogTitle className="text-white text-lg font-black tracking-tight uppercase opacity-90">{editingInvoiceId ? "Tahrirlash" : "Yangi faktura"}</DialogTitle>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => setIsFullScreen(!isFullScreen)} 
                className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/5 rounded-lg transition-all flex items-center justify-center group/btn"
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-[42%] overflow-y-auto p-4 bg-black/40 custom-scrollbar">
              <form id="invoiceForm" onSubmit={handleSaveInvoice} className="space-y-6 pb-10">
                {/* 1. Meta data section - Grid layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1 tracking-wider">Invoice Raqami</label>
                    <Input readOnly value={nextInvoiceNumber} className="glass-input h-10 text-xs bg-white/5 border-white/10" placeholder="Yuklanmoqda..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1 tracking-wider">Loyiha (Project)</label>
                    <select value={projectIdForm} onChange={e => setProjectIdForm(e.target.value ? Number(e.target.value) : "")} required className="w-full glass-input h-10 px-3 rounded-md bg-white/5 border-white/10 text-xs text-white">
                      <option value="" className="text-black">Loyiha tanlang...</option>
                      {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1 tracking-wider">To'lov muddati</label>
                    <Input type="date" required value={dueDateForm} onChange={e => setDueDateForm(e.target.value)} className="glass-input h-10 text-xs date-picker-white-icon" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1 tracking-wider">Valyuta</label>
                    <select value={formCurrency} onChange={e => setFormCurrency(e.target.value as any)} className="w-full glass-input h-10 px-3 rounded-md bg-white/5 border-white/10 text-xs text-white">
                      <option value="UZS" className="text-black">UZS (So'm)</option>
                      <option value="USD" className="text-black">USD (Dollar)</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase pl-1 tracking-wider">Xolati (Status)</label>
                    <select value={statusForm} onChange={e => setStatusForm(e.target.value as any)} className="w-full glass-input h-10 px-3 rounded-md bg-white/5 border-white/10 text-xs text-white">
                      <option value="pending" className="text-black">Kutilmoqda</option>
                      <option value="paid" className="text-black">To'langan</option>
                      <option value="unpaid" className="text-black">To'lanmadi</option>
                    </select>
                  </div>
                </div>

                {/* 2. Shartnoma section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-blue-500/30" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">Shartnoma ma'lumotlari</span>
                    <div className="flex-1 h-px bg-blue-500/30" />
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-blue-500/10 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Kim bilan (Shartnoma tuzilgan tomon)</label>
                      <Input value={contractPartnerForm} onChange={e => setContractPartnerForm(e.target.value)} placeholder="Mijoz / Kompaniya nomi" className="glass-input h-10 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Boshlanish sanasi</label>
                        <Input type="date" value={contractStartDateForm} onChange={e => setContractStartDateForm(e.target.value)} className="glass-input h-10 text-xs date-picker-white-icon" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Tugash sanasi</label>
                        <Input type="date" value={contractEndDateForm} onChange={e => setContractEndDateForm(e.target.value)} className="glass-input h-10 text-xs date-picker-white-icon" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Kimga section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-amber-500/30" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest whitespace-nowrap">Kimga</span>
                    <div className="flex-1 h-px bg-amber-500/30" />
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-amber-500/10 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Mijoz (Ism-sharif)</label>
                      <Input value={clientNameForm} onChange={e => setClientNameForm(e.target.value)} placeholder="Mijoz ismi" className="glass-input h-10 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Kompaniya nomi</label>
                      <Input value={companyForm} onChange={e => setCompanyForm(e.target.value)} placeholder="Kompaniya nomi" className="glass-input h-10 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-white/30 uppercase pl-1">Aloqa ma'lumotlari (Manzil, Tel, Email)</label>
                      <Input value={billToContactForm} onChange={e => setBillToContactForm(e.target.value)} placeholder="Masalan: Toshkent, +998..., info@..." className="glass-input h-10 text-xs" />
                    </div>
                  </div>
                </div>

                {/* 4. Xizmatlar section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-rose-500/30" />
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest whitespace-nowrap">Xizmatlar</span>
                    <div className="flex-1 h-px bg-rose-500/30" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceRows(prev => [...prev, { title: "", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "row" }])} className="h-7 px-3 text-[10px] border-white/20 hover:bg-white/10 rounded-lg">
                        <Plus className="w-3 h-3 mr-1" /> Qator
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInvoiceRows(prev => [...prev, { title: "Server", quantity: 1, paidQuantity: 1, unitPrice: "", serviceType: "server", startDate: format(new Date(), "yyyy-MM-dd") }])} className="h-7 px-3 text-[10px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-lg font-bold">
                        <Plus className="w-3 h-3 mr-1" /> Server
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {invoiceRows.map((row, i) => (
                      <div key={i} className="group relative bg-white/[0.02] border border-white/10 rounded-xl p-4 transition-all hover:bg-white/[0.04] hover:border-white/20">
                        {/* Elegant Delete Button */}
                        <button 
                          type="button" 
                          onClick={() => setInvoiceRows(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all z-30 hover:bg-rose-600 hover:scale-110 active:scale-95"
                        >
                          <X className="w-3 h-3" />
                        </button>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-end gap-4">
                            {/* Xizmat nomi - Left Aligned */}
                            <div className="flex-[3.5] space-y-1.5">
                              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Xizmat nomi</label>
                              <Input 
                                value={row.title} 
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} 
                                placeholder="Xizmat nomi..." 
                                className="glass-input h-10 text-[12px] bg-black/40 border-white/5 focus:border-white/20" 
                              />
                            </div>

                            {/* Boshlanish - Left Aligned */}
                            <div className="flex-[2.5] space-y-1.5">
                              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest pl-1">Boshlanish</label>
                              <Input 
                                type="date" 
                                value={row.startDate || ""} 
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, startDate: e.target.value } : x))} 
                                className="glass-input h-10 text-[11px] date-picker-white-icon bg-black/40 border-white/5 px-2" 
                              />
                            </div>

                            {/* Kuni - Centered */}
                            <div className="flex-[1] space-y-1.5 flex flex-col items-center">
                              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest w-full text-center">Kuni</label>
                              <Input 
                                type="number" 
                                value={row.quantity} 
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} 
                                placeholder="0" 
                                className="glass-input h-10 text-[12px] text-center bg-black/40 border-white/5 px-1" 
                              />
                            </div>

                            {/* To'lov - Centered */}
                            <div className="flex-[1.5] space-y-1.5 flex flex-col items-center">
                              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest w-full text-center">To'lov (soni)</label>
                              <Input 
                                type="number" 
                                value={row.paidQuantity} 
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, paidQuantity: e.target.value } : x))} 
                                placeholder="0" 
                                className="glass-input h-10 text-[12px] text-center bg-black/40 border-white/5 px-1 font-bold text-amber-500/80" 
                              />
                            </div>

                            {/* Narxi - Right Aligned */}
                            <div className="flex-[1.5] space-y-1.5 flex flex-col items-end">
                              <label className="text-[10px] font-black text-white/20 uppercase tracking-widest w-full text-right pr-1">Narxi</label>
                              <Input 
                                type="number" 
                                value={row.unitPrice} 
                                onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} 
                                placeholder="0" 
                                className="glass-input h-10 text-[12px] text-right bg-black/40 border-white/5 px-3 font-bold" 
                              />
                            </div>
                          </div>

                          {/* Subtle Project Link */}
                          <div className="flex items-center gap-3 pt-2 mt-1 border-t border-white/[0.03]">
                            <span className="text-[9px] font-bold text-blue-400/30 uppercase tracking-[0.2em] pl-1">Loyiha bog'lanishi:</span>
                            <select 
                              value={row.projectId || ""} 
                              onChange={e => setInvoiceRows(prev => prev.map((x, j) => j === i ? { ...x, projectId: e.target.value ? Number(e.target.value) : undefined } : x))}
                              className="bg-transparent border-none text-[10px] text-white/30 focus:text-white/60 transition-colors cursor-pointer outline-none min-w-[200px]"
                            >
                              <option value="" className="text-black italic">Loyiha tanlanmagan...</option>
                              {projects?.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer total - Enhanced Typography */}
                <div className="pt-8 mt-6 border-t border-white/10 flex justify-between items-center px-4">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Umumiy hisob:</span>
                  <div className="text-right flex items-baseline gap-2">
                    <span className="text-sm font-bold text-white/30">$</span>
                    <span className="text-3xl font-black text-white tracking-tighter leading-none">
                      {new Intl.NumberFormat().format(totalFromRows)}
                    </span>
                    <span className="text-[11px] font-bold text-white/30 uppercase">{formCurrency}</span>
                  </div>
                </div>
              </form>
            </div>
            <div className="w-[58%] bg-slate-100 p-8 overflow-y-auto flex justify-center items-start custom-scrollbar">
              {invoiceSettings && (
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
                  settings={invoiceSettings}
                />
              )}
            </div>
          </div>
          <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-slate-900">
            <Button variant="outline" onClick={() => setIsInvDialogOpen(false)}>Bekor qilish</Button>
            <Button form="invoiceForm" type="submit" className="bg-secondary px-8">Saqlash</Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            onStatusChange={(id, status) => updateInvoice.mutate({ id, status })}
            pdfGeneratingId={pdfGeneratingId}
          />
        ))}
      </div>
    </AppLayout>
  );
}
