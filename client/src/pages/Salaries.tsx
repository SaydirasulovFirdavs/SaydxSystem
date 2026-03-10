import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Trash2, Edit, Calendar as CalendarIcon, User, Info, DollarSign, ArrowRight, TrendingUp } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

type Salary = {
    id: number;
    userId: string;
    totalSalary: string;
    advance: string;
    remainingAmount: string;
    projectBonus: string;
    fine: string;
    totalPaid: string;
    month: number;
    year: number;
    note?: string;
    createdAt: string;
};

type Employee = { id: string; firstName: string; lastName: string; username: string; companyRole?: string };

export default function Salaries() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const { toast } = useToast();
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSalary, setEditingSalary] = useState<Salary | null>(null);

    const { data: salaries, isLoading: isSalariesLoading } = useQuery<Salary[]>({
        queryKey: [`/api/salaries?month=${selectedMonth}&year=${selectedYear}`],
        staleTime: 0, // Force fresh fetch
    });

    const { data: employees } = useQuery<Employee[]>({
        queryKey: ["/api/employees"],
        enabled: isAdmin
    });

    // Form State
    const [formData, setFormData] = useState({
        userId: "",
        totalSalary: "",
        advance: "0",
        projectBonus: "0",
        fine: "0",
        note: ""
    });

    // Auto-calculations
    const calculations = useMemo(() => {
        const total = Number(formData.totalSalary) || 0;
        const adv = Number(formData.advance) || 0;
        const bonus = Number(formData.projectBonus) || 0;
        const fine = Number(formData.fine) || 0;
        const remaining = total - adv - fine;
        const final = remaining + bonus;
        return { remaining, final };
    }, [formData.totalSalary, formData.advance, formData.projectBonus, formData.fine]);

    const createSalary = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/salaries", {
                ...data,
                remainingAmount: String(calculations.remaining),
                totalPaid: String(calculations.final),
                month: selectedMonth,
                year: selectedYear
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/salaries?month=${selectedMonth}&year=${selectedYear}`] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Muvaffaqiyatli", description: "Oylik ma'lumoti saqlandi." });
        }
    });

    const updateSalary = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("PUT", `/api/salaries/${editingSalary?.id}`, {
                ...data,
                remainingAmount: String(calculations.remaining),
                totalPaid: String(calculations.final)
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/salaries?month=${selectedMonth}&year=${selectedYear}`] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Yangilandi", description: "Oylik ma'lumoti yangilandi." });
        }
    });

    const deleteSalary = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/salaries/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/salaries?month=${selectedMonth}&year=${selectedYear}`] });
            toast({ title: "O'chirildi", description: "Oylik ma'lumoti o'chirildi." });
        }
    });

    const handleEdit = (s: Salary) => {
        setEditingSalary(s);
        setFormData({
            userId: s.userId,
            totalSalary: s.totalSalary,
            advance: s.advance,
            projectBonus: s.projectBonus,
            fine: s.fine || "0",
            note: s.note || ""
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingSalary(null);
        setFormData({ userId: "", totalSalary: "", advance: "0", projectBonus: "0", fine: "0", note: "" });
    };

    const months = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
        "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
    ];

    const currentTotalPayout = salaries?.reduce((sum, s) => sum + Number(s.totalPaid), 0) || 0;

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-primary" /> {isAdmin ? "Xodimlar Oyligi" : "Mening Maoshlarim"}
                    </h1>
                    <p className="text-muted-foreground italic text-sm">
                        {isAdmin
                            ? "XODIMLAR OYLIK MAOSHI, AVANS VA BONUSLARINI BOSHQARISH."
                            : "O'Z OYLIK MAO'SHINGIZ, AVANS VA BONUSLARINGIZNI KUZATIB BORING."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                    <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-[140px] glass-input border-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-panel border-white/10">
                            {months.map((m, i) => (
                                <SelectItem key={m} value={String(i + 1)} className="text-white hover:bg-white/10">{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[100px] glass-input border-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-panel border-white/10">
                            {[2024, 2025, 2026].map(y => (
                                <SelectItem key={y} value={String(y)} className="text-white hover:bg-white/10">{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {isAdmin && (
                        <>
                            <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />
                            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) resetForm();
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-10 px-5 rounded-xl shadow-lg transition-all active:scale-95">
                                        <Plus className="w-4 h-4 mr-2" /> Qo'shish
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="glass-panel border-white/10 sm:max-w-lg overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-display font-black text-white flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <DollarSign className="w-6 h-6" />
                                            </div>
                                            {editingSalary ? "Maoshni Tahrirlash" : "Yangi Maosh Kiritish"}
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Xodim</label>
                                            <Select
                                                disabled={!!editingSalary}
                                                value={formData.userId}
                                                onValueChange={v => setFormData(p => ({ ...p, userId: v }))}
                                            >
                                                <SelectTrigger className="glass-input h-12">
                                                    <SelectValue placeholder="Xodimni tanlang..." />
                                                </SelectTrigger>
                                                <SelectContent className="glass-panel border-white/10 max-h-60">
                                                    {employees?.map(emp => (
                                                        <SelectItem key={emp.id} value={emp.id} className="text-white hover:bg-white/10 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{emp.firstName} {emp.lastName}</span>
                                                                <span className="text-[10px] opacity-60">@{emp.username}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Umumiy oylik</label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        type="text"
                                                        value={formData.totalSalary}
                                                        onChange={e => setFormData(p => ({ ...p, totalSalary: e.target.value }))}
                                                        className="glass-input h-12 pr-12 font-bold text-lg text-blue-400"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-4 text-white/30 font-bold">$</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Avans</label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        type="text"
                                                        value={formData.advance}
                                                        onChange={e => setFormData(p => ({ ...p, advance: e.target.value }))}
                                                        className="glass-input h-12 pr-12 font-bold text-lg text-amber-400"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-4 text-white/30 font-bold">$</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Loyihadan bonus</label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        type="text"
                                                        value={formData.projectBonus}
                                                        onChange={e => setFormData(p => ({ ...p, projectBonus: e.target.value }))}
                                                        className="glass-input h-12 pr-12 font-bold text-lg text-emerald-400"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-4 text-white/30 font-bold">$</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Jarima (Shtraf)</label>
                                                <div className="relative flex items-center">
                                                    <Input
                                                        type="text"
                                                        value={formData.fine}
                                                        onChange={e => setFormData(p => ({ ...p, fine: e.target.value }))}
                                                        className="glass-input h-12 pr-12 font-bold text-lg text-red-400"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-4 text-white/30 font-bold">$</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <div className="bg-black/40 rounded-2xl p-5 border border-white/5 shadow-inner">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex justify-between items-center text-white/40 text-xs font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                                                        <span>Hisob-kitob ma'lumoti</span>
                                                        <span>Formula</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium text-white/70">Asosiy qism (Oylik - Avans - Jarima)</span>
                                                        <span className="font-mono font-bold text-white tracking-tight">${calculations.remaining.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium text-white/70">Qo'shimcha (Bonus)</span>
                                                        <span className="font-mono font-bold text-emerald-400 tracking-tight">+${(Number(formData.projectBonus) || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-px bg-white/10 my-1" />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-base font-black text-indigo-400 uppercase tracking-widest leading-none">Jami to'lov</span>
                                                        <span className="text-3xl font-black text-white tracking-tighter drop-shadow-lg leading-none">${calculations.final.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-white/50 mb-1.5 block">Izoh (ixtiyoriy)</label>
                                            <Input
                                                value={formData.note}
                                                onChange={e => setFormData(p => ({ ...p, note: e.target.value }))}
                                                className="glass-input h-12 text-white/80"
                                                placeholder="Bonus sababi yoki boshqa eslatmalar..."
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <Button
                                            onClick={() => editingSalary ? updateSalary.mutate(formData) : createSalary.mutate(formData)}
                                            disabled={!formData.userId || !formData.totalSalary || createSalary.isPending || updateSalary.isPending}
                                            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black h-14 text-lg rounded-2xl shadow-[0_10px_25px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-1 active:translate-y-0"
                                        >
                                            {(createSalary.isPending || updateSalary.isPending) ? "Saqlanmoqda..." : "Saqlash"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel p-6 border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-900/10 relative overflow-hidden ${!isAdmin ? "md:col-span-3" : ""}`}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400 border border-blue-500/30">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">{isAdmin ? "Jami To'lovlar" : "Mening Oyligim (Jami)"}</p>
                            <h2 className="text-3xl font-black text-white tracking-tighter">${currentTotalPayout.toLocaleString()}</h2>
                        </div>
                    </div>
                </motion.div>

                {isAdmin && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="glass-panel p-6 border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-purple-900/10 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Xodimlar Soni</p>
                                    <h2 className="text-3xl font-black text-white tracking-tighter">{salaries?.length || 0} ta</h2>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-panel p-6 border-white/5 relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-white/10 rounded-2xl text-white/60 border border-white/10">
                                    <Info className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white/40 uppercase tracking-widest">O'rtacha maosh</p>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">
                                        ${salaries?.length ? Math.round(currentTotalPayout / salaries.length).toLocaleString() : 0}
                                    </h2>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>

            {isSalariesLoading ? (
                <LoadingSpinner message="Ma'lumotlar yuklanmoqda..." />
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {salaries?.map((s, idx) => {
                            const emp = isAdmin ? employees?.find(e => e.id === s.userId) : user;
                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-panel group relative overflow-hidden p-6 hover:bg-white/[0.03] transition-all duration-300 border border-white/5 hover:border-white/10"
                                >
                                    {isAdmin && (
                                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <Button
                                                size="icon" variant="ghost"
                                                className="h-9 w-9 bg-black/40 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg"
                                                onClick={() => handleEdit(s)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon" variant="ghost"
                                                className="h-9 w-9 bg-black/40 text-red-500 hover:text-white hover:bg-red-600 rounded-lg"
                                                onClick={() => {
                                                    if (confirm(`${emp?.firstName} ning oylik ma'lumotini o'chirmoqchimisiz?`)) {
                                                        deleteSalary.mutate(s.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex items-center gap-4 min-w-[240px]">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                                <User className="w-7 h-7" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-lg text-white truncate">
                                                    {emp ? `${emp.firstName} ${emp.lastName}` : (isAdmin ? "Noma'lum xodim" : `${user?.firstName} ${user?.lastName}`)}
                                                </h3>
                                                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest truncate">@{emp?.username || user?.username || "---"}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Oylik</p>
                                                <p className="text-base font-black text-white tracking-tighter">${Number(s.totalSalary).toLocaleString()}</p>
                                            </div>
                                            <div className="relative pl-4 border-l border-white/5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-1">Avans</p>
                                                <p className="text-base font-bold text-amber-400 tracking-tighter">-${Number(s.advance).toLocaleString()}</p>
                                            </div>
                                            <div className="relative pl-4 border-l border-white/5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-1">Jarima</p>
                                                <p className="text-base font-bold text-red-400 tracking-tighter">-${(Number(s.fine) || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="relative pl-4 border-l border-white/5">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-1">Bonus</p>
                                                <p className="text-base font-bold text-emerald-400 tracking-tighter">+${Number(s.projectBonus).toLocaleString()}</p>
                                            </div>
                                            <div className="relative bg-white/[0.05] p-3 rounded-2xl border border-white/5 text-center px-4">
                                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Jami To'lov</p>
                                                <p className="text-xl font-black text-white tracking-tighter">${Number(s.totalPaid).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {s.note && (
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-white/40 italic">
                                            <Info className="w-3.5 h-3.5 opacity-50" />
                                            <span>{s.note}</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {(!salaries || salaries.length === 0) && (
                        <div className="py-20 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <h3 className="text-2xl font-bold text-white mb-2">Ma'lumotlar mavjud emas</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                {isAdmin
                                    ? "Ushbu oy uchun hali maosh kiritilmagan."
                                    : "Sizning ushbu oydagi maoshingiz hali hisoblanmagan yoki kiritilmagan. Iltimos, ma'muriyat bilan bog'laning."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </AppLayout>
    );
}
