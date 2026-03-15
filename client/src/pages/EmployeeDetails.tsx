import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChevronLeft, Save, User, UserCog, Eye, EyeOff, Trash2, ShieldAlert, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { priorityLabel, statusLabel } from "@/lib/uz";
import { useDeleteEmployee } from "@/hooks/use-employees";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";

type Employee = { id: string; username: string; firstName: string; lastName: string; role: string; companyRole?: string };
type Task = { id: number; title: string; description: string; priority: string; status: string; createdAt: Date; projectId: number };

export default function EmployeeDetails() {
    const params = useParams();
    const employeeId = params.id;
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();
    const [, setLocation] = useLocation();

    const deleteEmployee = useDeleteEmployee();

    const { data: employee, isLoading: isEmpLoading } = useQuery<Employee>({
        queryKey: [`/api/employees/${employeeId}`],
    });

    const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[]>({
        queryKey: [`/api/employees/${employeeId}/tasks`],
    });

    const { data: projects } = useProjects();
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    // useCreateTask hook takes a projectId, but it's used inside mutationFn
    // Actually, useCreateTask is bound to a single projectId.
    // If we want to create tasks for different projects, we might need a custom mutation or use it separately.
    // Let's check the hook again. useCreateTask(projectId) uses projectId in path.
    // So we'll call it dynamically in the component or use a raw mutation.
    // Since useCreateTask is defined as a hook, we can't call it inside a handler.
    // But we can create a custom version or just use apiRequest.

    const createTaskMutation = useMutation({
        mutationFn: async ({ projectId, data }: { projectId: number, data: any }) => {
            const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}/tasks`] });
            toast({ title: "Muvaffaqiyatli", description: "Vazifa biriktirildi." });
            setIsTaskDialogOpen(false);
        },
        onError: (err: any) => {
            toast({ title: "Xato", description: err.message, variant: "destructive" });
        }
    });

    const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const pId = Number(fd.get("projectId"));
        if (!pId) return toast({ title: "Xato", description: "Loyiha tanlanmagan!", variant: "destructive" });

        const taskData = {
            title: fd.get("title") as string,
            description: fd.get("description") as string,
            priority: fd.get("priority") as string,
            status: "todo",
            assigneeId: employeeId,
        };

        createTaskMutation.mutate({ projectId: pId, data: taskData });
    };

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
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-blue-400 backdrop-blur-sm shadow-xl">
                            <UserCog className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                                {employee.firstName} {employee.lastName}
                            </h1>
                            <p className="text-sm text-blue-400 font-bold uppercase tracking-widest mt-1">@{employee.username}</p>
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 font-bold tracking-wide"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Xodimni o'chirish
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-panel border-red-500/20 max-w-sm">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white flex items-center gap-2">
                                    <ShieldAlert className="text-red-500 w-5 h-5" /> Diqqat!
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    Haqiqatan ham <strong className="text-white">{employee.firstName} {employee.lastName}</strong> profilini va unga tegishli barcha ma'lumotlarni o'chirib tashlamoqchimisiz?
                                    Bu amallarni ortga qaytarib bo'lmaydi.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Bekor qilish</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                                    onClick={async () => {
                                        if (employeeId) {
                                            await deleteEmployee.mutateAsync(employeeId);
                                            setLocation("/employees");
                                        }
                                    }}
                                >
                                    O'chirish
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                    <div className="glass-panel p-6 rounded-3xl max-w-2xl border-white/5 relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

                        <h2 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
                            <ShieldAlert className="text-blue-400 w-5 h-5" /> Tahrirlash
                        </h2>
                        <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold tracking-tight text-white/70 mb-1.5 block">Ism</label>
                                    <Input name="firstName" defaultValue={employee.firstName} className="glass-input text-white font-medium" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold tracking-tight text-white/70 mb-1.5 block">Familiya</label>
                                    <Input name="lastName" defaultValue={employee.lastName} className="glass-input text-white font-medium" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold tracking-tight text-white/70 mb-1.5 block">Kompaniyadagi roli / Lavozimi</label>
                                    <Input name="companyRole" defaultValue={employee.companyRole || ""} className="glass-input text-white font-medium max-w-md" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold tracking-tight text-white/70 mb-1.5 block">Login (Username)</label>
                                    <Input name="username" defaultValue={employee.username} required className="glass-input text-white font-medium bg-black/40" />
                                </div>
                            </div>
                            <div className="pt-6 mt-2 border-t border-white/5">
                                <label className="text-sm font-bold tracking-tight text-white/70 mb-1.5 block">Yangi parol (faqat o'zgartirish uchun)</label>
                                <div className="relative flex items-center w-full md:max-w-xs">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="O'zgarishsiz qoldirish uchun bo'sh qoldiring"
                                        className="glass-input text-white w-full pr-12 font-medium"
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
                                <Button type="submit" disabled={updateEmployee.isPending} className="bg-secondary hover:bg-secondary/90 text-white font-black h-11 px-8 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                                    <Save className="w-4 h-4 mr-2" /> {updateEmployee.isPending ? "Saqlanmoqda..." : "Saqlash"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                    <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
                        {columns.map(col => (
                            <div key={col.id} className={`w-80 shrink-0 rounded-2xl p-4 glass-panel border-t-2 ${col.color}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`font-semibold ${col.headerColor}`}>{col.title}</h3>
                                    <div className="flex items-center gap-2">
                                        {col.id === "todo" && (
                                            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="w-6 h-6 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-background border-0 p-0">
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="glass-panel border-white/10">
                                                    <DialogHeader><DialogTitle className="text-white">Yangi vazifa biriktirish</DialogTitle></DialogHeader>
                                                    <form onSubmit={handleTaskSubmit} className="space-y-4 mt-4 text-left">
                                                        <div>
                                                            <label className="text-sm text-white/70 block mb-1">Loyihani tanlang</label>
                                                            <select name="projectId" required className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white">
                                                                <option value="" className="text-black">Loyihalar...</option>
                                                                {(projects || []).filter(p => p.status !== 'completed').map(p => (
                                                                    <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-sm text-white/70 block mb-1">Vazifa nomi</label>
                                                            <Input name="title" required className="glass-input text-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm text-white/70 block mb-1">Tavsif</label>
                                                            <textarea name="description" rows={3} className="w-full rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white focus:ring-2 focus:ring-primary/50" />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm text-white/70 block mb-1">Muhimlik</label>
                                                            <select name="priority" className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white">
                                                                <option value="low" className="text-black">Past</option>
                                                                <option value="medium" className="text-black" selected>O'rta</option>
                                                                <option value="high" className="text-black">Yuqori</option>
                                                            </select>
                                                        </div>
                                                        <Button type="submit" disabled={createTaskMutation.isPending} className="w-full bg-primary text-background font-bold h-11">
                                                            {createTaskMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                                                        </Button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/70">
                                            {tasksByStatus[col.id]?.length || 0}
                                        </span>
                                    </div>
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
