import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTasks, useUpdateTask, useLogTime } from "@/hooks/use-tasks";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Play, Check, Clock, LayoutGrid, List, Square, CheckCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { priorityLabel, statusLabel } from "@/lib/uz";

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

    const updateTask = useUpdateTask(0); // projectId doesn't matter for individual update
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

    const columns = [
        { id: "todo", title: "Qilinishi kerak", color: "border-white/20" },
        { id: "in progress", title: "Bajarilmoqda", color: "border-primary/50" },
        { id: "done", title: "Bajarildi", color: "border-emerald-500/50" }
    ];

    if (isLoading) return <AppLayout><LoadingSpinner message="Vazifalar yuklanmoqda..." /></AppLayout>;

    if (isError) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <p className="text-destructive font-medium">Vazifalar yuklanmadi.</p>
                    <p className="text-white/50 text-sm max-w-md">{(error as Error)?.message}</p>
                    <Button variant="outline" onClick={() => refetch()}>Qayta yuklash</Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-white mb-2">Mening vazifalarim</h1>
                <p className="text-muted-foreground">Sizga biriktirilgan barcha vazifalar loyihalar bo'yicha.</p>
            </div>

            {runningTimer && (
                <div className="glass-panel rounded-xl p-4 mb-6 flex items-center justify-between border-primary/30">
                    <span className="text-white font-medium">Ishlayapti: {Math.floor(timerElapsed / 60)} min {timerElapsed % 60} s</span>
                    <Button size="sm" className="bg-destructive hover:bg-destructive/90" onClick={handleStopTimer}>
                        <Square className="w-4 h-4 mr-2" /> To'xtatish
                    </Button>
                </div>
            )}

            <div className="flex gap-4 mb-6">
                <Button variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "bg-primary" : "border-white/20"}>
                    <LayoutGrid className="w-4 h-4 mr-2" /> Kanban
                </Button>
                <Button variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-primary" : "border-white/20"}>
                    <List className="w-4 h-4 mr-2" /> Ro'yxat
                </Button>
            </div>

            {viewMode === "kanban" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {columns.map(col => {
                        const colTasks = (tasks || []).filter(t => t.status === col.id);
                        return (
                            <div key={col.id} className="flex flex-col gap-4">
                                <div className={`border-b-2 ${col.color} pb-2 flex justify-between items-center`}>
                                    <h3 className="font-display font-semibold text-lg text-white capitalize">{col.title}</h3>
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/70">{colTasks.length}</span>
                                </div>
                                <div className="space-y-4">
                                    {colTasks.map(task => (
                                        <motion.div layout key={task.id} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <h4 className="font-semibold text-white group-hover:text-primary transition-colors break-words min-w-0">{task.title}</h4>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${task.priority === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-white/70'}`}>
                                                    {priorityLabel(task.priority)}
                                                </span>
                                            </div>
                                            {task.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>}

                                            <div className="flex justify-between items-center pt-3 border-t border-white/5 gap-2">
                                                <div className="flex items-center gap-2">
                                                    {col.id !== "done" && (
                                                        <>
                                                            <button onClick={() => handleLogTime(task.id)} className="text-xs text-white/50 hover:text-primary" title="Vaqt qo'shish">
                                                                <Clock className="w-3 h-3" />
                                                            </button>
                                                            {runningTimer?.taskId === task.id ? (
                                                                <button onClick={handleStopTimer} className="text-xs text-destructive">To'xtatish</button>
                                                            ) : (
                                                                <button onClick={() => handleStartTimer(task.id)} className="text-xs text-emerald-400">Boshlash</button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {col.id === "todo" && (
                                                        <button onClick={() => handleStatusChange(task.id, "in progress")} className="p-1.5 bg-primary/20 text-primary rounded-md" title="Boshlash">
                                                            <Play className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {col.id === "in progress" && (
                                                        <button onClick={() => handleStatusChange(task.id, "done")} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md" title="Tugatish">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <Link href={`/projects/${task.projectId}`}>
                                                        <button className="p-1.5 bg-white/5 text-white/50 rounded-md hover:text-white" title="Loyihaga o'tish">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div className="text-center p-8 border border-dashed border-white/5 rounded-xl text-white/20 text-sm">
                                            Vazifa yo'q
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 text-left text-sm font-semibold text-white/70">Vazifa</th>
                                <th className="p-4 text-left text-sm font-semibold text-white/70">Holat</th>
                                <th className="p-4 text-left text-sm font-semibold text-white/70">Vaqt</th>
                                <th className="p-4 text-right text-sm font-semibold text-white/70">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(tasks || []).map(task => (
                                <tr key={task.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-white">{task.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1">ID: #{task.id}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full ${task.status === "done" ? "bg-emerald-500/10 text-emerald-400" :
                                            task.status === "in progress" ? "bg-primary/10 text-primary" :
                                                "bg-white/10 text-white/70"
                                            }`}>
                                            {statusLabel(task.status)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-white/80">{task.loggedMinutes} min</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-3">
                                            <Link href={`/projects/${task.projectId}`}>
                                                <button className="text-xs text-white/50 hover:text-white">Loyihaga o'tish</button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Manual time dialog */}
            <Dialog open={isManualTimeOpen} onOpenChange={o => { if (!o) setManualTimeTaskId(null); setIsManualTimeOpen(o); }}>
                <DialogContent className="glass-panel border-white/10 text-white">
                    <DialogHeader><DialogTitle className="text-white">Qo'lda vaqt qo'shish</DialogTitle></DialogHeader>
                    <form onSubmit={handleManualTimeSubmit} className="space-y-4 mt-4">
                        <div>
                            <label className="text-sm text-white/70 block mb-1">Daqiqa</label>
                            <Input name="minutes" type="number" min={1} required className="glass-input" />
                        </div>
                        <div>
                            <label className="text-sm text-white/70 block mb-1">Izoh</label>
                            <Input name="description" className="glass-input" placeholder="Nima ish qilindi? (ixtiyoriy)" />
                        </div>
                        <Button type="submit" disabled={logTime.isPending} className="w-full bg-primary text-background">Saqlash</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
