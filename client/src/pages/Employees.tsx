import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type Employee = { id: string; username: string; firstName: string; lastName: string; role: string; companyRole?: string };

export default function Employees() {
    const [isOpen, setIsOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const { data: employees, isLoading, isError, refetch } = useQuery<Employee[]>({
        queryKey: ["/api/employees"],
    });

    const createEmployee = useMutation({
        mutationFn: async (data: Record<string, string>) => {
            const res = await fetch("/api/register-employee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || "Xatolik yuz berdi");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
            setIsOpen(false);
            toast({
                title: "Muvaffaqiyatli",
                description: "Yangi xodim qo'shildi.",
            });
        },
        onError: (error) => {
            toast({
                title: "Xatolik",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        createEmployee.mutate(Object.fromEntries(formData.entries()) as Record<string, string>);
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
                    <p className="text-muted-foreground">Tizimdagi barcha xodimlarni boshqarish.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/80 text-background font-bold shadow-[0_4px_20px_rgba(0,240,255,0.3)] hover:shadow-[0_4px_25px_rgba(0,240,255,0.5)] transition-all">
                            <Plus className="w-5 h-5 mr-2" />
                            Yangi Xodim
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-panel border-white/10 sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-display text-white">Xodim qo'shish</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1 block">Ism</label>
                                <Input name="firstName" required className="glass-input text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1 block">Familiya (ixtiyoriy)</label>
                                <Input name="lastName" className="glass-input text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1 block">Kompaniyadagi roli (masalan, Backend dasturchi)</label>
                                <Input name="companyRole" className="glass-input text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1 block">Login (Username)</label>
                                <Input name="username" required className="glass-input text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white/70 mb-1 block">Parol</label>
                                <div className="relative flex items-center">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        required
                                        className="glass-input text-white pr-12 w-full"
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
                            <Button type="submit" disabled={createEmployee.isPending} className="w-full mt-4 bg-primary hover:bg-primary/90 text-background font-bold">
                                {createEmployee.isPending ? "Qo'shilmoqda..." : "Saqlash"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees?.map((emp) => (
                    <div
                        key={emp.id}
                        onClick={() => setLocation(`/employees/${emp.id}`)}
                        className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all flex flex-col gap-4 group cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center text-white/50 group-hover:text-primary transition-all">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{emp.firstName} {emp.lastName}</h3>
                                <p className="text-sm text-primary font-medium">@{emp.username}</p>
                            </div>
                        </div>
                        {emp.companyRole && (
                            <div className="bg-white/5 px-3 py-1.5 rounded-md inline-block self-start border border-white/5">
                                <p className="text-xs text-white/70">{emp.companyRole}</p>
                            </div>
                        )}
                    </div>
                ))}
                {(!employees || employees.length === 0) && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                        Hozircha xodimlar yo'q
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
