import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export type PaymentDetailLine = { title: string; value: string };
export type InvoiceSettingsType = {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    bankName: string;
    accountNumber: string;
    paymentDetailLines?: PaymentDetailLine[];
    paymentNote: string;
    authorizedName: string;
    authorizedPosition: string;
};

const defaultPaymentLines: PaymentDetailLine[] = [
    { title: "Bank nomi", value: "Your Bank Name" },
    { title: "Hisob raqami", value: "1234 5678 9012 3456" },
];

export function InvoiceSettingsForm({
    initial,
    onSuccess,
}: {
    initial: InvoiceSettingsType;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<InvoiceSettingsType>(initial);
    const [paymentLines, setPaymentLines] = useState<PaymentDetailLine[]>(
        initial.paymentDetailLines?.length ? initial.paymentDetailLines : defaultPaymentLines
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(initial);
        setPaymentLines(
            initial.paymentDetailLines?.length ? initial.paymentDetailLines : defaultPaymentLines
        );
    }, [initial]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            const payload = {
                companyName: form.companyName,
                address: form.address,
                phone: form.phone,
                email: form.email,
                website: form.website,
                paymentNote: form.paymentNote,
                authorizedName: form.authorizedName,
                authorizedPosition: form.authorizedPosition,
                paymentDetailLines: paymentLines.map((l) => ({
                    title: String(l.title ?? ""),
                    value: String(l.value ?? ""),
                })),
            };
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch("/api/settings/invoice", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Saqlashda xato");
            }
            onSuccess();
        } catch (err) {
            if (err instanceof Error) {
                if (err.name === "AbortError") setError("Server javob bermadi. Qayta urinib ko'ring.");
                else setError(err.message);
            } else setError("Xato");
        } finally {
            setSaving(false);
        }
    };

    const field = (key: keyof Omit<InvoiceSettingsType, "paymentDetailLines">, label: string, placeholder?: string) => (
        <div key={key}>
            <label className="text-sm text-white/80 block mb-1">{label}</label>
            <Input
                className="glass-input text-white w-full"
                value={form[key] as string}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder ?? label}
            />
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("companyName", "Kompaniya / FROM nomi")}
                {field("address", "Manzil")}
                {field("phone", "Telefon")}
                {field("email", "Email")}
                {field("website", "Veb-sayt")}
                {field("paymentNote", "To'lov haqida eslatma")}
                {field("authorizedName", "Imzo egasi (ism)")}
                {field("authorizedPosition", "Lavozim")}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm text-white/80">To'lov ma'lumotlari (sarlavha + qiymat)</label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white"
                        onClick={() => setPaymentLines((prev) => [...prev, { title: "", value: "" }])}
                    >
                        <Plus className="w-4 h-4 mr-1" /> Qator qo'shish
                    </Button>
                </div>
                <p className="text-xs text-white/60">
                    Masalan: Bank nomi, Hisob raqami — yoki Karta egasi, Karta raqami. Har bir qatorni o'chirish mumkin.
                </p>
                {paymentLines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <Input
                            className="col-span-4 glass-input text-white"
                            placeholder="Sarlavha (masalan: Karta egasi)"
                            value={line.title}
                            onChange={(e) =>
                                setPaymentLines((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                                )
                            }
                        />
                        <Input
                            className="col-span-6 glass-input text-white"
                            placeholder="Qiymat"
                            value={line.value}
                            onChange={(e) =>
                                setPaymentLines((prev) =>
                                    prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                                )
                            }
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="col-span-2 text-destructive"
                            onClick={() => setPaymentLines((prev) => prev.filter((_, j) => j !== i))}
                            title="O'chirish"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
                    {error}
                </p>
            )}
            <Button type="submit" className="bg-secondary text-white" disabled={saving}>
                {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
        </form>
    );
}
