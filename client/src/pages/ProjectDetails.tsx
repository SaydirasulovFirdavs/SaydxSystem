import { useState, useMemo, useEffect, Fragment } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useLogTime } from "@/hooks/use-tasks";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format, formatDistanceToNow, startOfDay } from "date-fns";
import { uz } from "date-fns/locale";
import { Play, Check, Plus, Clock, ChevronLeft, DollarSign, Target, List, LayoutGrid, Calendar as CalIcon, Square, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { riskLabel, statusLabel, priorityLabel, typeLabel } from "@/lib/uz";

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export default function ProjectDetails() {
  const params = useParams();
  const projectId = Number(params.id);

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);
  const { data: tasks, isLoading: isTasksLoading, isError: isTasksError, refetch: refetchTasks } = useTasks(projectId);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const updateProject = useUpdateProject();
  const logTime = useLogTime();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: employees } = useQuery<{ id: string, firstName: string, lastName: string }[]>({
    queryKey: ["/api/employees"],
    enabled: isAdmin
  });

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  const [manualTimeTaskId, setManualTimeTaskId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [runningTimer, setRunningTimer] = useState<{ taskId: number; startedAt: number } | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [reopenTaskId, setReopenTaskId] = useState<number | null>(null);
  const [dueDateTaskId, setDueDateTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (!runningTimer) return;
    const t = setInterval(() => setTimerElapsed(Math.floor((Date.now() - runningTimer.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [runningTimer]);

  const countdown = useMemo(() => {
    if (!project) return null;
    const end = new Date(project.deadlineDate);
    const now = new Date();
    if (end < now) return { text: "Muddat o'tdi", overdue: true };
    return { text: formatDistanceToNow(end, { addSuffix: true, locale: uz }), overdue: false };
  }, [project?.deadlineDate]);

  const { data: currencyData } = useQuery({
    queryKey: ["/api/currency-rate"],
    queryFn: async () => {
      const res = await fetch("/api/currency-rate", { credentials: "include" });
      return (await res.json()) as { usdToUzs?: number };
    },
  });
  const usdToUzs = currencyData?.usdToUzs ?? 12_500;

  const remainingAmount = useMemo(() => {
    if (!project) return 0;
    const budget = Number(project.budget);
    const paid = (budget * (project.paymentProgress || 0)) / 100;
    return Math.max(0, budget - paid);
  }, [project]);

  const paidAmount = useMemo(() => {
    if (!project) return 0;
    const budget = Number(project.budget);
    return (budget * (project.paymentProgress || 0)) / 100;
  }, [project]);

  const rootTasks = useMemo(() => Array.isArray(tasks) ? tasks.filter(t => !(t as any).parentTaskId) : [], [tasks]);
  const subtasksByParent = useMemo(() => {
    const map: Record<number, typeof tasks> = {};
    if (Array.isArray(tasks)) {
      tasks.forEach(t => {
        const pid = (t as any).parentTaskId;
        if (pid != null) {
          if (!map[pid]) map[pid] = [];
          map[pid].push(t);
        }
      });
    }
    return map;
  }, [tasks]);

  /** Ish foizi — vazifalar bo'yicha: Bajarildi / jami (faqat asosiy vazifalar) */
  const workPercentFromTasks = useMemo(() => {
    if (!rootTasks.length) return 0;
    const done = rootTasks.filter(t => t.status === "done").length;
    return Math.round((done / rootTasks.length) * 100);
  }, [rootTasks]);

  if (isProjectLoading || (isTasksLoading && !tasks)) {
    return <AppLayout><LoadingSpinner message="Loyiha tafsilotlari yuklanmoqda..." /></AppLayout>;
  }

  if (!project) return <AppLayout><div className="text-white">Loyiha topilmadi.</div></AppLayout>;

  if (isTasksError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-destructive font-medium">Vazifalar yuklanmadi. Server xatosi.</p>
          <Button variant="outline" onClick={() => refetchTasks()}>Qayta yuklash</Button>
          <Link href="/projects" className="text-sm text-muted-foreground hover:text-white">← Loyihalar ro'yxatiga</Link>
        </div>
      </AppLayout>
    );
  }

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parentId = formData.get("parentTaskId");
    const assigneeId = formData.get("assigneeId") as string;

    const taskData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      priority: formData.get("priority") as string,
      status: (editingTask?.status || "todo") as any,
      ...(parentId && parentId !== "" && { parentTaskId: Number(parentId) }),
      ...(assigneeId && assigneeId !== "" && { assigneeId }),
    };

    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...taskData });
      } else {
        await createTask.mutateAsync(taskData);
      }
      setIsTaskDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm("Haqiqatan ham ushbu vazifani o'chirmoqchimisiz?")) {
      await deleteTask.mutateAsync(taskId);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string, reopenComment?: string) => {
    await updateTask.mutateAsync({ id: taskId, status: newStatus, ...(reopenComment != null && { reopenComment }) });
    setReopenTaskId(null);
  };

  const handleSetDueDate = async (taskId: number, dueDate: string) => {
    await updateTask.mutateAsync({ id: taskId, dueDate: dueDate ? new Date(dueDate) : undefined });
    setDueDateTaskId(null);
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
  };

  const handleLogTime = async (taskId: number) => {
    setManualTimeTaskId(taskId);
    setIsManualTimeOpen(true);
  };

  const handleManualTimeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const mins = Number(fd.get("minutes"));
    if (manualTimeTaskId && mins > 0) {
      await logTime.mutateAsync({ taskId: manualTimeTaskId, durationMinutes: mins, description: (fd.get("description") as string) || undefined });
      setIsManualTimeOpen(false);
      setManualTimeTaskId(null);
    }
  };

  const columns = [
    { id: "todo", title: "Qilinishi kerak", color: "border-white/20" },
    { id: "in progress", title: "Bajarilmoqda", color: "border-primary/50" },
    { id: "done", title: "Bajarildi", color: "border-emerald-500/50" }
  ];

  const curr = project?.currency || "UZS";
  /** Asosiy valyutada (loyiha valyutasi) — USD: "$ 500", UZS: "500 000 UZS" */
  const fmtPrim = (n: number) =>
    curr === "USD" ? `$ ${Math.round(n).toLocaleString("en-US")}` : `${Math.round(n).toLocaleString("uz-UZ", { maximumFractionDigits: 0 })} UZS`;
  /** Ikkinchi valyutada — USD bo'lsa UZS, UZS bo'lsa USD */
  const fmtSec = (n: number) =>
    curr === "USD" ? `${Math.round(n * usdToUzs).toLocaleString("uz-UZ", { maximumFractionDigits: 0 })} UZS` : `$ ${Math.round(n / usdToUzs).toLocaleString("en-US")}`;
  const riskColor = (project?.riskLevel === "HIGH" ? "bg-red-500/20 text-red-400" : project?.riskLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400");

  return (
    <AppLayout>
      <div className="mb-6">
        <Link href="/projects">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white cursor-pointer mb-4">
            <ChevronLeft className="w-4 h-4" /> Loyihalar
          </span>
        </Link>
      </div>
      <div className="glass-panel rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
        <div className="relative flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-display font-black text-white tracking-tight">{project.name}</h1>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${riskColor}`}>
                  {riskLabel(project.riskLevel)}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/50 border border-white/10">
                  {typeLabel(project.type)}
                </span>
              </div>
            </div>

            {(project as { description?: string }).description && (
              <p className="text-white/60 text-lg leading-relaxed max-w-2xl font-medium italic">
                &ldquo;{(project as { description: string }).description}&rdquo;
              </p>
            )}

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <div className="p-2 bg-primary/20 rounded-xl text-primary">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Boshlandi</p>
                  <p className="text-sm font-bold text-white">
                    {project.startDate && isValidDate(new Date(project.startDate)) ? format(new Date(project.startDate), 'dd.MM.yyyy') : 'Belgilanmagan'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                <div className="p-2 bg-destructive/20 rounded-xl text-destructive">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Muddat</p>
                  <p className="text-sm font-bold text-white">
                    {project.deadlineDate && isValidDate(new Date(project.deadlineDate)) ? format(new Date(project.deadlineDate), 'dd.MM.yyyy') : 'Belgilanmagan'}
                  </p>
                </div>
              </div>
            </div>

            {countdown && (
              <div className={`mt-4 flex items-center gap-2 text-sm font-black italic tracking-tight ${countdown.overdue ? 'text-destructive animate-pulse' : 'text-primary'}`}>
                <Clock className="w-4 h-4" />
                {countdown.text}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && project.status !== "completed" && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                disabled={updateProject.isPending}
                onClick={() => {
                  if (window.confirm("Loyihani tugallangan deb belgilaysizmi? U \"Tugallangan loyihalar\" boʻlimiga oʻtadi.")) {
                    updateProject.mutate({ id: projectId, updates: { status: "completed" } });
                  }
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Tugallandi
              </Button>
            )}
            {isAdmin && (
              <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Target className="w-4 h-4 mr-2" /> Ish / To'lov %
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-white/10">
                  <DialogHeader><DialogTitle className="text-white">Ish va to'lov foizi</DialogTitle></DialogHeader>
                  <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); await updateProject.mutateAsync({ id: projectId, updates: { progress: workPercentFromTasks, paymentProgress: Number(fd.get("paymentProgress")) } }); setIsProgressDialogOpen(false); }} className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Ish foizi</label>
                      <p className="text-sm text-white/60">Vazifalar (Qilinishi kerak / Bajarilmoqda / Bajarildi) bo&apos;yicha avtomatik: <strong className="text-white">{workPercentFromTasks}%</strong></p>
                    </div>
                    <div>
                      <label className="text-sm text-white/70 block mb-1">To&apos;lov foizi (0–100) — foydalanuvchi kiritadi</label>
                      <Input name="paymentProgress" type="number" min={0} max={100} defaultValue={project.paymentProgress} className="glass-input text-white" />
                    </div>
                    <Button type="submit" disabled={updateProject.isPending} className="w-full bg-primary text-background">Saqlash</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {isAdmin && (
              <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-background"
                    onClick={() => {
                      setEditingTask(null);
                      setIsTaskDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Vazifa qo'shish
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-panel border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingTask ? "Vazifani tahrirlash" : "Yangi vazifa"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTaskSubmit} className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm text-white/70">Nomi</label>
                      <Input name="title" required className="glass-input text-white" defaultValue={editingTask?.title} />
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Tavsif</label>
                      <textarea
                        name="description"
                        className="w-full rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white focus:ring-2 focus:ring-primary/50"
                        rows={3}
                        defaultValue={editingTask?.description}
                      ></textarea>
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Muhimlik</label>
                      <select name="priority" className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white" defaultValue={editingTask?.priority || "medium"}>
                        <option value="low" className="text-black">Past</option>
                        <option value="medium" className="text-black">O'rta</option>
                        <option value="high" className="text-black">Yuqori</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Subtask (ixtiyoriy)</label>
                      <select name="parentTaskId" className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white" defaultValue={editingTask?.parentTaskId || ""}>
                        <option value="" className="text-black">Asosiy vazifa</option>
                        {rootTasks.map(t => (
                          <option key={t.id} value={t.id} className="text-black">{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-white/70">Mas'ul xodim (ixtiyoriy)</label>
                      <select name="assigneeId" className="w-full rounded-md border border-white/10 bg-black/20 p-2 text-white" defaultValue={editingTask?.assigneeId || ""}>
                        <option value="" className="text-black">Hech kim</option>
                        {employees?.map(emp => (
                          <option key={emp.id} value={emp.id} className="text-black">{emp.firstName} {emp.lastName}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" disabled={createTask.isPending} className="w-full bg-primary text-black">Saqlash</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="w-12 h-12" />
            </div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Umumiy Byudjet</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white">{fmtPrim(Number(project.budget))}</h3>
            </div>
            <p className="text-white/30 text-[10px] mt-1 font-medium">{fmtSec(Number(project.budget))}</p>
            <p className="text-white/20 text-[10px] mt-2 font-medium">Jami shartnoma summasi</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-emerald-400">
              <CheckCircle className="w-12 h-12" />
            </div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Toʻlangan Summa</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-emerald-400">{fmtPrim(paidAmount)}</h3>
            </div>
            <p className="text-white/30 text-[10px] mt-1 font-medium">{fmtSec(paidAmount)}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-white/30 font-bold">{project.paymentProgress || 0}%</span>
              <div className="h-1.5 flex-1 mx-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${project.paymentProgress || 0}%` }} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-primary">
              <Target className="w-12 h-12" />
            </div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Ish Foizi</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-primary">{workPercentFromTasks}%</h3>
              <span className="text-primary/50 font-bold">FAOL</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-white/30 font-bold">{workPercentFromTasks}%</span>
              <div className="h-1.5 flex-1 mx-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${workPercentFromTasks}%` }} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-destructive">
              <DollarSign className="w-12 h-12" />
            </div>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Qolgan Summa (Qarz)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-destructive">{fmtPrim(remainingAmount)}</h3>
            </div>
            <p className="text-white/30 text-[10px] mt-1 font-medium">{fmtSec(remainingAmount)}</p>
            <p className="text-white/20 text-[10px] mt-2 font-medium">Toʻlanishi kerak boʻlgan qoldiq</p>
          </motion.div>
        </div>
      </div>

      {/* Timer bar */}
      {runningTimer && (
        <div className="glass-panel rounded-xl p-4 mb-6 flex items-center justify-between border-primary/30">
          <span className="text-white font-medium">Ishlayapti: {Math.floor(timerElapsed / 60)} min {timerElapsed % 60} s</span>
          <Button size="sm" className="bg-destructive hover:bg-destructive/90" onClick={handleStopTimer}>
            <Square className="w-4 h-4 mr-2" /> To'xtatish
          </Button>
        </div>
      )}

      {/* View mode */}
      <div className="flex gap-2 mb-4">
        <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")} className={viewMode === "kanban" ? "bg-primary" : "border-white/20"}>
          <LayoutGrid className="w-4 h-4 mr-1" /> Kanban
        </Button>
        <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} className={viewMode === "list" ? "bg-primary" : "border-white/20"}>
          <List className="w-4 h-4 mr-1" /> Ro'yxat
        </Button>
        <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")} className={viewMode === "calendar" ? "bg-primary" : "border-white/20"}>
          <CalIcon className="w-4 h-4 mr-1" /> Kalendar
        </Button>
      </div>

      {/* Manual time dialog */}
      <Dialog open={isManualTimeOpen} onOpenChange={o => { if (!o) setManualTimeTaskId(null); setIsManualTimeOpen(o); }}>
        <DialogContent className="glass-panel border-white/10">
          <DialogHeader><DialogTitle className="text-white">Qo'lda vaqt qo'shish</DialogTitle></DialogHeader>
          <form onSubmit={handleManualTimeSubmit} className="space-y-4 mt-4">
            <Input name="minutes" type="number" min={1} required placeholder="Daqiqa" className="glass-input text-white" />
            <Input name="description" placeholder="Izoh (ixtiyoriy)" className="glass-input text-white" />
            <Button type="submit" disabled={logTime.isPending} className="w-full bg-primary text-background">Saqlash</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* List view */}
      {viewMode === "list" && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-3 text-left text-sm text-white/70">Vazifa</th>
                <th className="p-3 text-left text-sm text-white/70">Holat</th>
                <th className="p-3 text-left text-sm text-white/70">Vaqt</th>
                <th className="p-3 text-right text-sm text-white/70">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rootTasks.map(task => (
                <Fragment key={task.id}>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3">
                      <span className="font-medium text-white">{task.title}</span>
                      {(subtasksByParent[task.id]?.length || 0) > 0 && (
                        <div className="mt-1 ml-4 text-sm text-muted-foreground">
                          {subtasksByParent[task.id]?.map(st => <div key={st.id}>• {st.title}</div>)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-sm text-white/80">{statusLabel(task.status)}</td>
                    <td className="p-3 text-sm text-white/80">{task.loggedMinutes} min</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleLogTime(task.id)} className="text-xs text-primary">Vaqt</button>
                        {runningTimer?.taskId === task.id ? (
                          <button onClick={handleStopTimer} className="text-xs text-destructive">To'xtatish</button>
                        ) : (
                          <button onClick={() => handleStartTimer(task.id)} className="text-xs text-emerald-400">Boshlash</button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskDialogOpen(true);
                              }}
                              className="p-1 rounded bg-white/5 text-white/40 hover:text-primary transition-colors"
                              title="Tahrirlash"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 rounded bg-white/5 text-white/40 hover:text-destructive transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar view: tasks grouped by created date */}
      {viewMode === "calendar" && (
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-muted-foreground text-sm mb-4">Vazifalar yaratilgan sana bo'yicha</p>
          <div className="space-y-4">
              {Object.entries(
                (Array.isArray(tasks) ? tasks : []).reduce<Record<string, typeof tasks>>((acc, t) => {
                  const dateObj = new Date(t.createdAt);
                  const key = isValidDate(dateObj) ? format(startOfDay(dateObj), "yyyy-MM-dd") : "Nomalum";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(t);
                  return acc;
                }, {})
              )
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, list]) => (
                <div key={date} className="border-b border-white/5 pb-4">
                  <p className="text-sm font-medium text-white/80 mb-2">{format(new Date(date), "dd.MM.yyyy")}</p>
                  <div className="flex flex-wrap gap-2">
                    {(list || []).map(t => (
                      <span key={t.id} className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white">
                        {t.title} — {t.loggedMinutes} min
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(col => {
            const filtered = rootTasks.filter(t => t.status === col.id);
            const colTasks = col.id === "todo" ? [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : filtered;
            return (
              <div key={col.id} className="flex flex-col gap-4">
                <div className={`border-b-2 ${col.color} pb-2`}>
                  <h3 className="font-display font-semibold text-lg text-white capitalize">{col.title} <span className="text-muted-foreground text-sm font-normal ml-2">({colTasks.length})</span></h3>
                </div>
                <div className="space-y-4">
                  {colTasks.map(task => {
                    const t = task as { dueDate?: string | null; reopenComment?: string | null };
                    const isDone = col.id === "done";
                    return (
                      <motion.div layout key={task.id} className="glass-panel p-4 rounded-xl border border-white/5 hover:border-primary/30 transition-all group min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="font-semibold text-white group-hover:text-primary transition-colors break-words min-w-0">{task.title}</h4>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${task.priority === 'high' ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-white/70'}`}>
                            {priorityLabel(task.priority)}
                          </span>
                        </div>
                        {task.description && <p className="text-sm text-muted-foreground mb-2 break-words whitespace-pre-wrap">{task.description}</p>}
                        {t.dueDate && (
                          <p className="text-xs text-primary/90 mb-1 break-words">Muddat: {format(new Date(t.dueDate), "dd.MM.yyyy")}</p>
                        )}
                        {t.reopenComment && (
                          <p className="text-xs text-amber-400/90 mb-1 italic break-words">Izoh: {t.reopenComment}</p>
                        )}
                        {(subtasksByParent[task.id]?.length || 0) > 0 && (
                          <div className="mb-2 pl-2 border-l-2 border-white/10 text-xs text-muted-foreground break-words">
                            {subtasksByParent[task.id]?.map(st => <div key={st.id}>• {st.title}</div>)}
                          </div>
                        )}
                        {task.assigneeId && (
                          <div className="mb-2 text-xs text-sky-400 flex items-center gap-1">
                            Mas'ul: {employees?.find(e => e.id === task.assigneeId)?.firstName || "Xodim"}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-white/5 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {!isDone && (
                              <>
                                <button onClick={() => handleLogTime(task.id)} className="flex items-center text-xs text-white/50 hover:text-primary transition-colors">
                                  <Clock className="w-3 h-3 mr-1" /> {task.loggedMinutes} min
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
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskDialogOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10 transition-all"
                                  title="Tahrirlash"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                                  title="O'chirish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {col.id === "todo" && (
                              <button onClick={() => handleStatusChange(task.id, "in progress")} className="p-1.5 bg-primary/20 text-primary rounded-md hover:bg-primary hover:text-background" title="Bajarilmoqda">
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {col.id === "in progress" && (
                              <button onClick={() => handleStatusChange(task.id, "done")} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md hover:bg-emerald-500 hover:text-background" title="Bajarildi">
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {isDone && (
                              <>
                                <button onClick={() => setReopenTaskId(task.id)} className="p-1.5 bg-amber-500/20 text-amber-400 rounded-md hover:bg-amber-500 hover:text-background text-xs" title="Qilinishi kerakga qaytarish">
                                  Qaytarish
                                </button>
                                <button onClick={() => setDueDateTaskId(task.id)} className="p-1.5 bg-white/10 text-white/70 rounded-md hover:bg-white/20 text-xs" title="Yangi muddat">
                                  Muddat
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Qaytarish (izoh bilan) dialog */}
      <Dialog open={reopenTaskId != null} onOpenChange={o => !o && setReopenTaskId(null)}>
        <DialogContent className="glass-panel border-white/10">
          <DialogHeader><DialogTitle className="text-white">Qilinishi kerakga qaytarish</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleStatusChange(reopenTaskId!, "todo", (fd.get("comment") as string) || undefined); }} className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/70 block mb-1">Izoh (noto&apos;g&apos;ri bo&apos;lsa sababini yozing)</label>
              <textarea name="comment" rows={3} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40" placeholder="Masalan: Xato bajarilgan, qayta tekshirish kerak" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">Qaytarish</Button>
              <Button type="button" variant="outline" onClick={() => setReopenTaskId(null)}>Bekor qilish</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Yangi muddat dialog */}
      <Dialog open={dueDateTaskId != null} onOpenChange={o => !o && setDueDateTaskId(null)}>
        <DialogContent className="glass-panel border-white/10">
          <DialogHeader><DialogTitle className="text-white">Yangi muddat</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSetDueDate(dueDateTaskId!, fd.get("dueDate") as string); }} className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/70 block mb-1">Muddat</label>
              <Input name="dueDate" type="date" className="glass-input text-white" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-primary text-background">Saqlash</Button>
              <Button type="button" variant="outline" onClick={() => setDueDateTaskId(null)}>Bekor qilish</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
