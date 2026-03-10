import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useInvoiceItems, useAddInvoiceItem, useDeleteInvoiceItem } from "@/hooks/use-finance";

export function InvoiceItemsDialog({
    invId,
    onClose,
    projects,
}: {
    invId: number | null;
    onClose: () => void;
    projects?: { id: number; name: string }[];
}) {
    const { data: items = [] } = useInvoiceItems(invId);
    const addItem = useAddInvoiceItem(invId ?? 0);
    const deleteItem = useDeleteInvoiceItem(invId ?? 0);
    const [title, setTitle] = useState("");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [paidQuantity, setPaidQuantity] = useState<number | string>(1);
    const [unitPrice, setUnitPrice] = useState("");
    const [startDate, setStartDate] = useState("");
    const [projectId, setProjectId] = useState<number | undefined>();

    const lowTitle = title.toLowerCase();
    const serviceType = lowTitle === "server" ? "server" : lowTitle === "api" ? "api" : "row";

    if (invId == null) return null;
    return (
        <Dialog open={invId != null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="glass-panel border-white/10 max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-white">Faktura xizmatlari</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 sm:col-span-4">
                            <label className="text-[9px] font-bold text-white/30 uppercase block mb-1">Xizmat nomi</label>
                            <Input
                                className="glass-input text-white"
                                placeholder="Server, API, ..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                            <label className="text-[9px] font-bold text-white/30 uppercase block mb-1">Kuni necha</label>
                            <Input
                                type="number"
                                min={1}
                                className="glass-input text-white"
                                placeholder="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-2">
                            <label className="text-[9px] font-bold text-blue-400/60 uppercase block mb-1">To'lov (Nechtasi)</label>
                            <Input
                                type="number"
                                min={1}
                                className="glass-input text-white border-blue-500/30"
                                placeholder="1"
                                value={paidQuantity}
                                onChange={(e) => setPaidQuantity(e.target.value)}
                            />
                        </div>
                        <div className="col-span-12 sm:col-span-4">
                            <label className="text-[9px] font-bold text-white/30 uppercase block mb-1">Narxi</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    className="glass-input text-white"
                                    placeholder="0.00"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                />
                                <Button
                                    size="sm"
                                    className="bg-secondary text-white"
                                    disabled={!title.trim() || !unitPrice || addItem.isPending}
                                    onClick={() => {
                                        addItem.mutate(
                                            {
                                                title: title.trim(),
                                                quantity: Number(quantity) || 1,
                                                paidQuantity: Number(paidQuantity) || 1,
                                                unitPrice,
                                                serviceType,
                                                ...(startDate && { startDate }),
                                                ...(projectId && { projectId }),
                                            },
                                            {
                                                onSuccess: () => {
                                                    setTitle("");
                                                    setQuantity(1);
                                                    setPaidQuantity(1);
                                                    setUnitPrice("");
                                                    setStartDate("");
                                                    setProjectId(undefined);
                                                },
                                            }
                                        );
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {(serviceType === "server" || serviceType === "api") && (
                            <div className="col-span-12 grid grid-cols-12 gap-3 pt-2 border-t border-white/5">
                                <div className="col-span-6">
                                    <label className="text-[9px] font-bold text-blue-400 uppercase block mb-1">Loyiha bog'lanishi</label>
                                    <select
                                        className="w-full glass-input p-2 rounded-md text-white text-xs"
                                        value={projectId ?? ""}
                                        onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                                    >
                                        <option value="" className="text-black">Loyiha tanlang...</option>
                                        {projects?.map((p) => (
                                            <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-6">
                                    <label className="text-[9px] font-bold text-blue-400 uppercase block mb-1">Boshlanish sanasi</label>
                                    <Input
                                        type="date"
                                        className="glass-input text-white date-picker-white-icon text-xs"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                        <ul className="divide-y divide-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                            {items.length === 0 ? (
                                <li className="p-8 text-center text-white/20 text-xs italic">Xizmatlar mavjud emas</li>
                            ) : (
                                items.map((item: any) => {
                                    const type = (item.serviceType || "").toLowerCase();
                                    const mult = (type === "server" || type === "api") ? Number(item.paidQuantity || 1) : Number(item.quantity || 1);
                                    return (
                                        <li key={item.id} className="flex justify-between items-center px-4 py-3 hover:bg-white/5 transition-colors group">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-sm tracking-tight">{item.title}</span>
                                                <span className="text-[10px] text-white/40 uppercase font-black tracking-widest mt-0.5">
                                                    {mult} × {new Intl.NumberFormat().format(Number(item.unitPrice))} sum = {new Intl.NumberFormat().format(mult * Number(item.unitPrice))} sum
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-white/20 hover:text-red-400 hover:bg-red-400/10 h-8 w-8 transition-all group-hover:visible sm:invisible"
                                                onClick={() => deleteItem.mutate(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
