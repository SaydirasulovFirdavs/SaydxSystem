import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChevronLeft, Save, User, UserCog, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { priorityLabel, statusLabel } from "@/lib/uz";

type Employee = { id: string; username: string; firstName: string; lastName: string; role: string; companyRole?: string };
type Task = { id: number; title: string; description: string; priority: string; status: string; createdAt: Date; projectId: number };

export default function EmployeeDetails() {
    const params = useParams();
    const employeeId = params.id;
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const { data: employee, isLoading: isEmpLoading } = useQuery<Employee>({
        queryKey: [`/api/employees/${employeeId}`],
    });

    const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
        queryKey: [`/api/employees/${employeeId}/tasks`],
    });

    const updateEmployee = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("PUT", `/api/employees/${employeeId}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
            toast({ title: "Muvaffaqiyatli", description: "Xodim ma'lumotlari yangilandi." });
        },
    });

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: any = {};
        if (fd.get("firstName")) data.firstName = fd.get("firstName");
        if (fd.get("lastName")) data.lastName = fd.get("lastName");
        if (fd.get("companyRole")) data.companyRole = fd.get("companyRole");
        if (fd.get("username")) data.username = fd.get("username");

        // faqat yozsa yangilanadi
        const password = fd.get("password");
        if (password) data.password = password;

        updateEmployee.mutate(data);
    };

    if (isEmpLoading || isTasksLoading) {
        return <AppLayout><LoadingSpinner message="Yuklanmoqda..." /></AppLayout>;
    }

    if (!employee) {
        return <AppLayout><div className="text-white">Xodim topilmadi.</div></AppLayout>;
    }

    const columns = [
        { id: "todo", title: "Qilinishi kerak", color: "border-white/20", headerColor: "text-white/70" },
        { id: "in progress", title: "Bajarilmoqda", color: "border-primary/50", headerColor: "text-primary" },
        { id: "done", title: "Bajarildi", color: "border-emerald-500/50", headerColor: "text-emerald-400" },
    ];

    const tasksByStatus = columns.reduce((acc, col) => {
        acc[col.id] = (tasks || []).filter(t => t.status === col.id);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <AppLayout>
            <div className="mb-6">
                <Link href="/employees">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white cursor-pointer mb-4 transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Xodimlar
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-primary/80">
                        <UserCog className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">
                            {employee.firstName} {employee.lastName}
                        </h1>
                        <p className="text-sm text-primary font-medium">@{employee.username}</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="info" className="w-full">
                <TabsList className="bg-white/5 border border-white/5 p-1 rounded-xl mb-6">
                    <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-background">
                        Ma'lumotlar
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-background">
                        Vazifalar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                    <div className="glass-panel p-6 rounded-2xl max-w-2xl border-white/5">
                        <h2 className="text-xl font-semibold text-white mb-6">Tahrirlash</h2>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1 block">Ism</label>
                                    <Input name="firstName" defaultValue={employee.firstName} className="glass-input text-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1 block">Familiya</label>
                                    <Input name="lastName" defaultValue={employee.lastName} className="glass-input text-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1 block">Kompaniyadagi roli (masalan, Backend dasturchi)</label>
                                    <Input name="companyRole" defaultValue={employee.companyRole || ""} className="glass-input text-white" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white/70 mb-1 block">Login (Username)</label>
                                    <Input name="username" defaultValue={employee.username} required className="glass-input text-white" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <label className="text-sm font-medium text-white/70 mb-1 block">Yangi parol (faqat o'zgartirish uchun)</label>
                                <div className="relative flex items-center w-full md:max-w-xs">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Parolni kiritmasangiz eski parol qoladi"
                                        className="glass-input text-white w-full pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 text-white/50 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" disabled={updateEmployee.isPending} className="bg-primary hover:bg-primary/90 text-background flex gap-2">
                                <Save className="w-4 h-4" /> Saqlash
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                    <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
                        {columns.map(col => (
                            <div key={col.id} className={`w-80 shrink-0 rounded-2xl p-4 glass-panel border-t-2 ${col.color}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold ${col.headerColor}`}>{col.title}</h3>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/70">
                                        {tasksByStatus[col.id]?.length || 0}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {tasksByStatus[col.id]?.map(task => (
                                        <div key={task.id} className="bg-black/40 hover:bg-black/60 transition-colors p-4 rounded-xl border border-white/5">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-semibold text-white/90 text-sm">{task.title}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${task.priority === "high" ? "bg-red-500/20 text-red-300" :
                                                    task.priority === "medium" ? "bg-amber-500/20 text-amber-300" :
                                                        "bg-emerald-500/20 text-emerald-300"
                                                    }`}>
                                                    {priorityLabel(task.priority)}
                                                </span>
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-white/60 mb-3 line-clamp-2">{task.description}</p>
                                            )}
                                            <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-white/5">
                                                <Link href={`/projects/${task.projectId}`}>
                                                    <span className="text-primary hover:text-primary/80 cursor-pointer flex items-center">
                                                        Loyihaga o'tish →
                                                    </span>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}

                                    {(!tasksByStatus[col.id] || tasksByStatus[col.id].length === 0) && (
                                        <div className="text-center p-4 border border-dashed border-white/10 rounded-xl text-white/40 text-sm">
                                            Vazifa yo'q
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </AppLayout>
    );
}
