import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUpdateTask, useLogTime } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
    Play,
    Check,
    Clock,
    LayoutGrid,
    List,
    Square,
    ChevronRight,
    AlertCircle,
    Calendar,
    Briefcase,
    Timer,
    ExternalLink,
    PlusCircle,
    CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { priorityLabel, statusLabel } from "@/lib/uz";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

type Task = {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    createdAt: string;
    projectId: number;
    loggedMinutes: number;
    dueDate: string | null;
    reopenComment: string | null;
};

export default function MyTasks() {
    const { data: tasks, isLoading, isError, error, refetch } = useQuery<Task[]>({
        queryKey: ["/api/tasks/my"],
    });

    const { data: projects } = useProjects();
    const updateTask = useUpdateTask(0);
    const logTime = useLogTime();

    const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
    const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
    const [manualTimeTaskId, setManualTimeTaskId] = useState<number | null>(null);
    const [runningTimer, setRunningTimer] = useState<{ taskId: number; startedAt: number } | null>(null);
    const [timerElapsed, setTimerElapsed] = useState(0);

    useEffect(() => {
        if (!runningTimer) return;
        const t = setInterval(() => setTimerElapsed(Math.floor((Date.now() - runningTimer.startedAt) / 1000)), 1000);
        return () => clearInterval(t);
    }, [runningTimer]);

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        await updateTask.mutateAsync({ id: taskId, status: newStatus });
        refetch();
    };

    const handleStartTimer = (taskId: number) => {
        if (runningTimer?.taskId === taskId) return;
        setRunningTimer({ taskId, startedAt: Date.now() });
        setTimerElapsed(0);
    };

    const handleStopTimer = async () => {
        if (!runningTimer) return;
        const minutes = Math.max(1, Math.floor((Date.now() - runningTimer.startedAt) / 60000));
        await logTime.mutateAsync({ taskId: runningTimer.taskId, durationMinutes: minutes });
        setRunningTimer(null);
        refetch();
    };

    const handleLogTime = (taskId: number) => {
        setManualTimeTaskId(taskId);
        setIsManualTimeOpen(true);
    };

    const handleManualTimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const mins = Number(fd.get("minutes"));
        if (manualTimeTaskId && mins > 0) {
            await logTime.mutateAsync({
                taskId: manualTimeTaskId,
                durationMinutes: mins,
                description: (fd.get("description") as string) || undefined
            });
            setIsManualTimeOpen(false);
            setManualTimeTaskId(null);
            refetch();
        }
    };

    const getProjectName = (id: number) => projects?.find(p => p.id === id)?.name || "Noma'lum loyiha";

    const columns = [
        { id: "todo", title: "Qilinishi kerak", color: "border-white/10", glow: "group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]", headerColor: "text-white/60" },
        { id: "in progress", title: "Bajarilmoqda", color: "border-primary/40", glow: "group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]", headerColor: "text-primary" },
        { id: "done", title: "Bajarildi", color: "border-emerald-500/40", glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]", headerColor: "text-emerald-400" }
    ];

    if (isLoading) return <AppLayout><LoadingSpinner message="Vazifalar yuklanmoqda..." /></AppLayout>;

    if (isError) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center py-20 gap-6 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 mb-2">
                        <AlertCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Xatolik yuz berdi</h2>
                        <p className="text-white/50 text-sm">{(error as Error)?.message || "Vazifalarni yuklashda muammo yuzaga keldi."}</p>
                    </div>
                    <Button variant="outline" className="glass-panel border-white/10 text-white px-8" onClick={() => refetch()}>
                        Qayta yuklash
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const currentRunningTask = tasks?.find(t => t.id === runningTimer?.taskId);

    return (
        <AppLayout>
            <div className="relative mb-10">
                {/* Background decorative elements */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h1 className="text-4xl font-display font-black text-white tracking-tight">Mening vazifalarim</h1>
                        </div>
                        <p className="text-white/50 font-medium max-w-md">
                            Sizning joriy ish yuklamangiz va loyihalar doirasidagi topshiriqlaringiz barchasi shu yerda.
                        </p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setViewMode("kanban")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${viewMode === "kanban" ? "bg-primary text-background shadow-lg shadow-primary/20" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Kanban
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${viewMode === "list" ? "bg-primary text-background shadow-lg shadow-primary/20" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                        >
                            <List className="w-4 h-4" /> Ro'yxat
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {runningTimer && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: -20 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -20 }}
                        className="overflow-hidden mb-8"
                    >
                        <div className="glass-panel rounded-3xl p-6 border-primary/40 bg-primary/5 relative overflow-hidden group">
                            {/* Pulsing indicator */}
                            <div className="absolute top-0 right-0 p-4">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_30px_rgba(0,240,255,0.3)] animate-pulse">
                                        <Timer className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {currentRunningTask?.title || "Vazifa bajarilmoqda..." }
                                        </h3>
                                        <p className="text-primary/70 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-primary" />
                                            {getProjectName(currentRunningTask?.projectId || 0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Ish vaqti</p>
                                        <p className="text-4xl font-display font-black text-white tabular-nums">
                                            {Math.floor(timerElapsed / 60).toString().padStart(2, '0')}:
                                            <span className="text-primary">{(timerElapsed % 60).toString().padStart(2, '0')}</span>
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="bg-red-500 hover:bg-red-600 text-white font-black px-8 h-14 rounded-2xl shadow-xl shadow-red-500/20 transform hover:scale-105 transition-all"
                                        onClick={handleStopTimer}
                                    >
                                        <Square className="w-5 h-5 mr-3 fill-current" /> To'xtatish
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {viewMode === "kanban" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {columns.map(col => {
                        const colTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === col.id) : [];
                        return (
                            <div key={col.id} className="flex flex-col gap-6 h-full min-h-[500px]">
                                <div className="flex justify-between items-center px-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${col.id === 'todo' ? 'bg-white/40' : col.id === 'in progress' ? 'bg-primary' : 'bg-emerald-400'}`} />
                                        <h3 className={`font-display font-black text-xl tracking-tight uppercase ${col.headerColor}`}>{col.title}</h3>
                                    </div>
                                    <span className="text-xs font-black bg-white/5 py-1 px-3 rounded-lg text-white/40 border border-white/5">
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div className="space-y-5 bg-white/2 backdrop-blur-sm p-4 rounded-[32px] border border-white/5 min-h-full">
                                    <AnimatePresence mode="popLayout">
                                        {colTasks.map(task => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                key={task.id}
                                                className={`glass-panel p-5 rounded-2xl border-l-[4px] ${col.color} hover:bg-white/5 transition-all group relative overflow-hidden ${col.glow}`}
                                            >
                                                {/* Card Glow Effect */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div className="flex justify-between items-start gap-4 mb-3 relative z-10">
                                                    <div>
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                            <Briefcase className="w-2.5 h-2.5" />
                                                            {getProjectName(task.projectId)}
                                                        </p>
                                                        <h4 className="font-bold text-white text-base leading-snug group-hover:text-primary transition-colors pr-4">
                                                            {task.title}
                                                        </h4>
                                                    </div>
                                                    <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-lg shrink-0 tracking-tighter shadow-sm ${
                                                        task.priority === 'high' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                                        task.priority === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    }`}>
                                                        {priorityLabel(task.priority)}
                                                    </span>
                                                </div>

                                                {task.description && (
                                                    <p className="text-sm text-white/50 mb-5 line-clamp-2 leading-relaxed relative z-10 italic">
                                                        "{task.description}"
                                                    </p>
                                                )}

                                                <div className="flex justify-between items-center pt-4 border-t border-white/5 gap-3 relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        {task.dueDate && !isNaN(new Date(task.dueDate).getTime()) && (
                                                            <div className="flex items-center gap-1.5 text-white/30">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-bold">{format(new Date(task.dueDate), 'd MMM', { locale: uz })}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-white/30">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span className="text-[11px] font-bold">{task.loggedMinutes}m</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {col.id !== "done" && (
                                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleLogTime(task.id)}
                                                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg border border-white/10 transition-all"
                                                                    title="Vaqt yozish"
                                                                >
                                                                    <PlusCircle className="w-4 h-4" />
                                                                </button>
                                                                {runningTimer?.taskId === task.id ? (
                                                                    <button
                                                                        onClick={handleStopTimer}
                                                                        className="h-8 px-3 flex items-center justify-center bg-red-500/20 text-red-500 rounded-lg border border-red-500/30 font-bold text-[10px] uppercase tracking-tighter"
                                                                    >
                                                                        To'xtatish
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleStartTimer(task.id)}
                                                                        className="h-8 px-3 flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold text-[10px] uppercase tracking-tighter"
                                                                    >
                                                                        Boshlash
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex gap-1.5">
                                                            {col.id === "todo" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(task.id, "in progress")}
                                                                    className="w-10 h-10 flex items-center justify-center bg-primary text-background rounded-xl shadow-lg shadow-primary/20 transform hover:scale-105 active:scale-95 transition-all"
                                                                    title="Bajarishni boshlash"
                                                                >
                                                                    <Play className="w-5 h-5 fill-current ml-1" />
                                                                </button>
                                                            )}
                                                            {col.id === "in progress" && (
                                                                <button
                                                                    onClick={() => handleStatusChange(task.id, "done")}
                                                                    className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transform hover:scale-105 active:scale-95 transition-all"
                                                                    title="Bajarildi deb belgilash"
                                                                >
                                                                    <Check className="w-6 h-6 stroke-[3]" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Project details link */}
                                                        <Link href={`/projects/${task.projectId}`}>
                                                            <div className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </div>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {colTasks.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                            <div className="w-16 h-16 rounded-3xl bg-white/2 border border-white/5 flex items-center justify-center mb-4 text-white/10">
                                                <CheckCircle className="w-8 h-8" />
                                            </div>
                                            <p className="text-white/20 text-sm font-bold uppercase tracking-widest whitespace-nowrap">
                                                {col.id === 'done' ? 'Hali hech narsa yo\'q' : 'Vazifalar yo\'q'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel rounded-[32px] overflow-hidden border border-white/5 bg-white/2 backdrop-blur-xl"
                >
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-6 text-left text-xs font-black text-white/40 uppercase tracking-[0.2em]">Vazifa va Loyiha</th>
                                <th className="p-6 text-left text-xs font-black text-white/40 uppercase tracking-[0.2em]">Holat</th>
                                <th className="p-6 text-left text-xs font-black text-white/40 uppercase tracking-[0.2em]">Sarflangan vaqt</th>
                                <th className="p-6 text-right text-xs font-black text-white/40 uppercase tracking-[0.2em]">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                            {(Array.isArray(tasks) ? tasks : []).map(task => (
                                <tr key={task.id} className="group hover:bg-white/[0.03] transition-all">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold group-hover:text-primary transition-colors">{task.title}</span>
                                            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">
                                                {getProjectName(task.projectId)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                                                task.status === "done" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                task.status === "in progress" ? "bg-primary/10 text-primary border border-primary/20" :
                                                "bg-white/5 text-white/40 border border-white/10"
                                            }`}>
                                                {statusLabel(task.status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-sm text-white font-bold">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-white/20" />
                                            {task.loggedMinutes} <span className="text-white/40 font-black text-[10px] uppercase">daq</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <Link href={`/projects/${task.projectId}`}>
                                            <Button variant="ghost" size="sm" className="bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 group-hover:border-white/10">
                                                Loyihaga o'tish <ExternalLink className="w-3.5 h-3.5 ml-2" />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!tasks || tasks.length === 0) && (
                        <div className="p-20 text-center">
                            <p className="text-white/20 font-black uppercase tracking-[0.3em]">Hozircha vazifalar biriktirilmagan</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Manual time dialog */}
            <Dialog open={isManualTimeOpen} onOpenChange={o => { if (!o) setManualTimeTaskId(null); setIsManualTimeOpen(o); }}>
                <DialogContent className="glass-panel border-white/10 bg-black/90 backdrop-blur-2xl text-white rounded-[32px] p-8 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                            <Clock className="text-primary w-6 h-6" />
                            Vaqt yozish
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualTimeSubmit} className="space-y-6 mt-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Daqiqa</label>
                            <Input
                                name="minutes"
                                type="number"
                                min={1}
                                required
                                className="glass-input h-14 text-lg font-bold bg-white/5 border-white/10 flex items-center"
                                placeholder="Masalan: 45"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Bajargan ishingiz</label>
                            <Input
                                name="description"
                                className="glass-input h-14 bg-white/5 border-white/10"
                                placeholder="Ixtiyoriy izoh..."
                            />
                        </div>
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={logTime.isPending}
                                className="w-full bg-primary hover:bg-primary/90 text-background font-black h-14 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all text-lg"
                            >
                                {logTime.isPending ? "Saqlanmoqda..." : "Saqlash"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
