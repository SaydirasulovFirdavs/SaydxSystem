import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, User, Eye, EyeOff, Edit, Trash2, ShieldAlert, MoreVertical } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/use-employees";

export default function Employees() {
    const { data: employees, isLoading, isError, refetch } = useEmployees();
    const createEmployee = useCreateEmployee();
    const updateEmployee = useUpdateEmployee();
    const deleteEmployee = useDeleteEmployee();

    // Dialog state for create/edit
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Initial state matching the DB schema
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        companyRole: "",
        username: "",
        password: ""
    });

    const resetForm = () => {
        setEditingEmployeeId(null);
        setFormData({ firstName: "", lastName: "", companyRole: "", username: "", password: "" });
        setShowPassword(false);
    };

    const handleEditClick = (emp: any) => {
        setEditingEmployeeId(emp.id);
        setFormData({
            firstName: emp.firstName || "",
            lastName: emp.lastName || "",
            companyRole: emp.companyRole || "",
            username: emp.username || "",
            password: "", // intentionally empty for updates
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            if (editingEmployeeId) {
                // Remove password from payload if it's empty
                const { password, ...rest } = formData;
                const payload = { id: editingEmployeeId, ...rest, ...(password ? { password } : {}) };

                await updateEmployee.mutateAsync(payload);
            } else {
                await createEmployee.mutateAsync(formData);
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to save employee:", error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Pre-calculate random colors for employee avatars to be persistent across renders
    const getGradientColors = (id: string, name: string) => {
        const colors = [
            "from-blue-500 to-indigo-600",
            "from-emerald-400 to-teal-600",
            "from-rose-400 to-red-600",
            "from-amber-400 to-orange-600",
            "from-fuchsia-500 to-purple-600",
            "from-cyan-400 to-blue-600"
        ];
        // simple stable mock hash based on ID and Name length
        const index = (id.charCodeAt(id.length - 1) + name.length) % colors.length;
        return colors[index];
    };

    if (isLoading) return <AppLayout><LoadingSpinner message="Xodimlar yuklanmoqda..." /></AppLayout>;

    if (isError) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <p className="text-destructive font-medium">Xodimlar ro'yxatini yuklashda xatolik yuz berdi.</p>
                    <Button variant="outline" onClick={() => refetch()}>Qayta yuklash</Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">Xodimlar</h1>
                    <p className="text-muted-foreground">Tizimdagi barcha xodimlarni boshqarish, qo'shish va parollarini yangilash.</p>
                </div>

                {/* Premium Action Bar */}
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setTimeout(resetForm, 200);
                        }}>
                            <DialogTrigger asChild>
                                <Button
                                    onClick={resetForm}
                                    className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black h-11 px-6 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all duration-300 active:scale-95 group"
                                >
                                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                                    Yangi Xodim
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-panel border-white/10 sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-display text-white">
                                        {editingEmployeeId ? "Xodimni Tahrirlash" : "Xodim Qo'shish"}
                                    </DialogTitle>
                                </DialogHeader>
                                <form key={editingEmployeeId || 'new'} onSubmit={handleSubmit} className="space-y-4 mt-4">
                                    <div>
                                        <label className="text-sm font-bold tracking-tight text-white/70 mb-1 block">Ism</label>
                                        <Input name="firstName" required value={formData.firstName} onChange={handleChange} className="glass-input text-white font-medium" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold tracking-tight text-white/70 mb-1 block">Familiya (ixtiyoriy)</label>
                                        <Input name="lastName" value={formData.lastName} onChange={handleChange} className="glass-input text-white font-medium" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold tracking-tight text-white/70 mb-1 block">Roli / Lavozimi</label>
                                        <Input name="companyRole" value={formData.companyRole} onChange={handleChange} className="glass-input text-white font-medium" placeholder="masalan, Katta Dasturchi" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold tracking-tight text-white/70 mb-1 block">Login (Username)</label>
                                        <Input name="username" required value={formData.username} onChange={handleChange} className="glass-input text-white font-medium bg-black/40" />
                                    </div>
                                    <div className="pt-2 border-t border-white/5">
                                        <label className="text-sm font-bold tracking-tight text-white/70 mb-1 block">
                                            {editingEmployeeId ? "Yangi Parol (ixtiyoriy)" : "Parol"}
                                        </label>
                                        <div className="relative flex items-center">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                required={!editingEmployeeId}
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder={editingEmployeeId ? "Shu bo'yi qolsa o'zgarmaydi..." : "Eng kamida 6ta belgi"}
                                                className="glass-input text-white pr-12 w-full font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 text-white/50 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={createEmployee.isPending || updateEmployee.isPending}
                                            className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-12 shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
                                        >
                                            {createEmployee.isPending || updateEmployee.isPending ? "Saqlanmoqda..." : "Saqlash"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {employees?.map((emp, idx) => {
                    const avatarGradient = getGradientColors(emp.id, emp.firstName);
                    const initals = (emp.firstName.charAt(0) + (emp.lastName?.charAt(0) || "")).toUpperCase();

                    return (
                        <motion.div
                            key={emp.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05, duration: 0.4 }}
                            className="glass-panel group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-white/5 to-white/[0.01] hover:border-white/20 hover:shadow-2xl transition-all duration-500 h-[220px]"
                        >
                            {/* Absolute Link Overlay for clean card clickability */}
                            <Link href={`/employees/${emp.id}`}>
                                <a className="absolute inset-0 z-10 rounded-3xl focus:outline-none" aria-label={`View ${emp.firstName} profile`} />
                            </Link>

                            <div className="absolute top-0 right-0 p-4 z-20 pointer-events-auto flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-black/40 text-blue-400 hover:text-white hover:bg-blue-500/80 mr-1 backdrop-blur-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleEditClick(emp);
                                    }}
                                    title="Tahrirlash"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full bg-black/40 text-red-400 hover:text-white hover:bg-red-500/80 backdrop-blur-md"
                                            title="O'chirish"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="glass-panel border-red-500/20 max-w-sm">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-white flex items-center gap-2">
                                                <ShieldAlert className="text-red-500 w-5 h-5" /> Diqqat!
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                Haqiqatan ham <strong className="text-white">{emp.firstName} {emp.lastName}</strong> ({emp.username}) profilini butunlay o'chirib tashlamoqchimisiz?
                                                Bu amallarni ortga qaytarib bo'lmaydi.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Bekor qilish</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                                onClick={() => deleteEmployee.mutate(emp.id)}
                                            >
                                                O'chirish
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                </div>
                            </div>

                            <div className="relative z-0 p-6 flex flex-col items-center text-center h-full pointer-events-none">
                                {/* Glow Effect Behind Avatar */}
                                <div className={`absolute top-10 w-24 h-24 bg-gradient-to-tr ${avatarGradient} blur-[40px] opacity-20 group-hover:opacity-60 transition-opacity duration-500 rounded-full pointer-events-none`} />

                                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-2xl font-black shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-2 border-white/10 mb-4 transform group-hover:scale-105 group-hover:-translate-y-1 transition-transform duration-500`}>
                                    {initals}
                                </div>

                                <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate w-full group-hover:text-blue-200 transition-colors">
                                    {emp.firstName} {emp.lastName}
                                </h3>
                                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-3 truncate w-full">@{emp.username}</p>

                                <div className="mt-auto pointer-events-none">
                                    {emp.companyRole ? (
                                        <div className="bg-black/50 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                                            <p className="text-[10px] text-white/60 font-medium truncate max-w-[160px]">{emp.companyRole}</p>
                                        </div>
                                    ) : (
                                        <div className="h-7" /> // Placeholder for alignment
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                {(!employees || employees.length === 0) && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <User className="text-white/20 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Xodimlar topilmadi</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Tizimga hali darhol xodimlar qo'shilmagan. Yuqoridagi tugma orqali yangi profil yarating.
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
