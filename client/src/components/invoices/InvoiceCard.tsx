import React from "react";
import { motion } from "framer-motion";
import { FileText, Edit, Trash2, Download, Calendar, DollarSign, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateInvoiceTotal } from "@/lib/invoiceUtils";

type InvoiceCardProps = {
    invoice: any;
    projectName?: string;
    onEdit: (invoice: any) => void;
    onDelete: (id: number) => void;
    onAddItems: (id: number) => void;
    onDownloadPdf: (invoice: any) => void;
    onStatusChange: (id: number, status: string) => void;
    pdfGeneratingId: number | null;
    idx: number;
};

export function InvoiceCard({
    invoice,
    projectName,
    onEdit,
    onDelete,
    onAddItems,
    onDownloadPdf,
    onStatusChange,
    pdfGeneratingId,
    idx,
}: InvoiceCardProps) {
    const tStatus = (status: string, lang: string) => {
        const T: Record<string, Record<string, string>> = {
            paid: { uz: "To'langan", en: "Paid", ru: "Оплачено" },
            pending: { uz: "Kutilmoqda", en: "Pending", ru: "Ожидает" },
            unpaid: { uz: "To'lanmadi", en: "Unpaid", ru: "Не оплачено" },
        };
        return T[status]?.[lang || "uz"] || status;
    };

    const statusColors: Record<string, string> = {
      paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      unpaid: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };

    const statusGlow: Record<string, string> = {
      paid: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      pending: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      unpaid: "shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    };

    const grandTotal = calculateInvoiceTotal(
        invoice.amount,
        invoice.paidAmount,
        invoice.vatRate,
        invoice.discountRate
    );

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                className="group relative h-full"
            >
                {/* Visual Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative glass-panel rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col h-full min-h-[320px] transition-all duration-500 hover:border-white/10 hover:shadow-2xl">
                    {/* Status accent top bar */}
                    <div className={`h-1.5 w-full shrink-0 ${invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "pending" ? "bg-amber-500" : "bg-rose-500"} opacity-70`} />
                    
                    <div className="p-7 flex flex-col flex-1">
                        {/* Header: Number & Status */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all duration-500">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">FAKTURA RAQAMI</p>
                                    <h3 className="text-xl font-black text-white tracking-tight">{invoice.invoiceNumber}</h3>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <select
                                    value={invoice.status || "pending"}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        onStatusChange(invoice.id, e.target.value);
                                    }}
                                    className={`appearance-none px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none hover:scale-105 active:scale-95 ${statusColors[invoice.status || 'pending']} ${statusGlow[invoice.status || 'pending']}`}
                                >
                                    <option value="paid" className="bg-slate-900 text-emerald-400">{tStatus("paid", invoice.language)}</option>
                                    <option value="pending" className="bg-slate-900 text-amber-400">{tStatus("pending", invoice.language)}</option>
                                    <option value="unpaid" className="bg-slate-900 text-rose-400">{tStatus("unpaid", invoice.language)}</option>
                                </select>
                            </div>
                        </div>

                        {/* Middle: Project & Client */}
                        <div className="space-y-4 mb-6">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-4 h-4 text-white/20 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Loyiha</p>
                                    <p className="text-sm font-bold text-white/80 line-clamp-1">{projectName || "---"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-white/20 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Mijoz</p>
                                    <p className="text-sm font-bold text-white/80 line-clamp-1">{invoice.clientName || "---"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Amount Section */}
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Jami summa</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-white tracking-tighter">
                                            {new Intl.NumberFormat("uz-UZ").format(grandTotal)}
                                        </span>
                                        <span className="text-xs font-black text-indigo-400 uppercase tracking-tighter">{invoice.currency}</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" onClick={() => onEdit(invoice)} className="h-9 w-9 bg-white/5 border border-white/5 text-white/40 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-white/10 text-white font-bold text-xs">Tahrirlash</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" onClick={() => onDelete(invoice.id)} className="h-9 w-9 bg-white/5 border border-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-white/10 text-white font-bold text-xs">O'chirish</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Date & PDF */}
                        <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-white/5">
                             <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-white/20" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                    Muddat: {format(new Date(invoice.dueDate), "dd.MM.yyyy")}
                                </span>
                             </div>

                             <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onAddItems(invoice.id)}
                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                                >
                                    Xizmatlar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={pdfGeneratingId === invoice.id}
                                    onClick={() => onDownloadPdf(invoice)}
                                    className="h-8 px-3 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    {pdfGeneratingId === invoice.id ? "..." : "PDF"}
                                </Button>
                             </div>
                        </div>
                    </div>

                    {/* Left Decorative Vertical Strip */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/[0.01] border-l border-white/5 hidden md:flex flex-col items-center justify-center gap-2 py-4">
                        <div className="[writing-mode:vertical-lr] rotate-180 text-[8px] font-black tracking-[0.4em] text-white/10 uppercase">
                            OFFICIAL INVOICE
                        </div>
                        <div className={`w-2 h-2 rounded-full ${invoice.status === "paid" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-white/10"}`} />
                    </div>
                </div>
            </motion.div>
        </TooltipProvider>
    );
}
