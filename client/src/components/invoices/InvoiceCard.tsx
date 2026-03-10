import React from "react";
import { motion } from "framer-motion";
import { FileText, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
            className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-secondary/30 transition-colors flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-secondary/10 text-secondary">
                    <FileText className="w-6 h-6" />
                </div>
                <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${invoice.status === "paid"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : invoice.status === "pending"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                >
                    {tStatus(invoice.status || "pending", invoice.language)}
                </span>
                <div className="ml-auto flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-secondary hover:text-white hover:bg-secondary/20"
                        onClick={() => onEdit(invoice)}
                        title="Tahrirlash"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/20"
                        onClick={() => onDelete(invoice.id)}
                        title="O'chirish"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{invoice.invoiceNumber}</h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                {projectName || "---"}
            </p>
            <div className="text-2xl font-bold text-white mb-2 mt-auto">
                {new Intl.NumberFormat("uz-UZ").format(Number(invoice.amount))} {invoice.currency}
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="text-secondary mb-4 w-fit"
                onClick={() => onAddItems(invoice.id)}
            >
                Xizmatlar / Qo'shish
            </Button>
            <div className="flex items-center justify-between border-t border-white/5 pt-4 gap-2 mt-2">
                <div className="text-xs text-muted-foreground">
                    Muddat: {format(new Date(invoice.dueDate), "dd.MM.yyyy")}
                </div>
                <div className="flex gap-2">
                    {(invoice.status === "pending" || invoice.status === "unpaid") && (
                        <select
                            value={invoice.status}
                            onChange={(e) => onStatusChange(invoice.id, e.target.value)}
                            className="text-xs bg-white/5 border border-white/20 rounded px-2 py-1 text-white"
                        >
                            <option value="paid" className="text-black">To'langan</option>
                            <option value="pending" className="text-black">Kutilmoqda</option>
                            <option value="unpaid" className="text-black">To'lanmadi</option>
                        </select>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary hover:text-white hover:bg-secondary/20"
                        disabled={pdfGeneratingId === invoice.id}
                        onClick={() => onDownloadPdf(invoice)}
                    >
                        <Download className="w-4 h-4 mr-1" />
                        {pdfGeneratingId === invoice.id ? "Yuklanmoqda..." : "PDF yuklash"}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
