import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { queryClient } from "@/lib/queryClient";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useCompanies } from "@/hooks/use-companies";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Plus, ChevronRight, AlertTriangle, CheckCircle, Clock, Briefcase, Calendar, Edit, Trash2, Filter, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { riskLabel, typeLabel } from "@/lib/uz";
import { api, buildUrl } from "@shared/routes";

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { data: companies } = useCompanies();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [selectedParty, setSelectedParty] = useState<string>(""); // "client-1" yoki "company-2"
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const deadlineDateInputRef = useRef<HTMLInputElement>(null);

  const activeProjects = Array.isArray(projects) ? projects.filter((p) => p.status !== "completed") : [];
  const completedProjects = Array.isArray(projects) ? projects.filter((p) => p.status === "completed") : [];

  if (isLoading) return <AppLayout><LoadingSpinner message="Loyihalar yuklanmoqda..." /></AppLayout>;

  const handleEditClick = (project: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setSelectedParty(project.clientId ? `client-${project.clientId}` : project.companyId ? `company-${project.companyId}` : "");
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteProjectId(id);
  };

  const confirmDelete = async () => {
    if (!deleteProjectId) return;
    try {
      await deleteProject.mutateAsync(deleteProjectId);
      setDeleteProjectId(null);
    } catch (error) {
      alert("O'chirishda xato yuz berdi.");
    }
  };

  const handleOpenNewDialog = () => {
    setEditingProject(null);
    setSelectedParty("");
    setIsDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startDateStr = (formData.get("startDate") as string)?.trim();
    const deadlineStr = (formData.get("deadlineDate") as string)?.trim();
    if (!selectedParty) {
      alert("Iltimos, mijoz yoki kompaniyani tanlang.");
      return;
    }
    if (!startDateStr || !deadlineStr) {
      alert("Iltimos, boshlanish va tugash sanasini kiriting.");
      return;
    }
    const startDate = new Date(startDateStr);
    const deadlineDate = new Date(deadlineStr);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(deadlineDate.getTime())) {
      alert("Iltimos, sana maydonlariga toʻgʻri sana kiriting.");
      return;
    }

    try {
      const isClient = selectedParty.startsWith("client-");
      const isCompany = selectedParty.startsWith("company-");
      const clientId = isClient ? Number(selectedParty.replace("client-", "")) : null;
      const companyId = isCompany ? Number(selectedParty.replace("company-", "")) : null;

      const projectData = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        clientId,
        companyId,
        type: formData.get("type") as string,
        budget: formData.get("budget") as string,
        currency: (formData.get("currency") as string) || "UZS",
        startDate,
        deadlineDate,
        additionalRequirements: (formData.get("additionalRequirements") as string) || undefined,
        priority: (formData.get("priority") as string) || "medium",
      };

      if (editingProject) {
        await updateProject.mutateAsync({
          id: editingProject.id,
          updates: projectData
        });
      } else {
        await createProject.mutateAsync(projectData as any);
      }
      setIsDialogOpen(false);
      setEditingProject(null);
      setSelectedParty("");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Xato yuz berdi.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'delayed': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      default: return <Clock className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <AppLayout>
      <div className="glass-panel rounded-3xl p-6 mb-8 border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black text-white tracking-tight flex items-center gap-3">
              <Briefcase className="w-10 h-10 text-primary animate-pulse" />
              Loyihalar
            </h1>
            <p className="text-white/50 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeProjects.length} ta faol loyiha boshqarilmoqda
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl transition-all duration-300 ${viewMode === "grid" ? "bg-white/10 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-xl transition-all duration-300 ${viewMode === "list" ? "bg-white/10 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>

            {isAdmin && (
              <Button
                onClick={handleOpenNewDialog}
                className="bg-primary hover:bg-primary/90 text-background font-bold px-6 py-6 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-6 h-6 mr-2" />
                Yangi Loyiha
              </Button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-panel border-white/10 sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display text-white">
                {editingProject ? "Loyihani tahrirlash" : "Yangi loyiha yaratish"}
              </DialogTitle>
              <DialogDescription className="text-white/50">
                {editingProject ? "Mavjud loyiha ma'lumotlarini o'zgartirish" : "Yangi loyiha uchun kerakli ma'lumotlarni kiriting"}
              </DialogDescription>
            </DialogHeader>
            <form key={editingProject?.id || 'new'} onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Nomi</label>
                <Input name="name" defaultValue={editingProject?.name} required className="glass-input text-white" placeholder="Masalan: Veb-sayt dizayni" />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Ishi nimalar qilish kerakligi haqida ma&apos;lumot</label>
                <textarea name="description" defaultValue={editingProject?.description} rows={3} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Loyihada qanday ishlar bajarilishi kerak..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-white/70 mb-1 block">Mijoz / Kompaniya</label>
                  <Select value={selectedParty} onValueChange={setSelectedParty}>
                    <SelectTrigger className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary/50 [&>span]:line-clamp-none [&>span]:whitespace-normal">
                      <SelectValue placeholder="Tanlang..." className="text-white placeholder:text-white/50" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[18rem] max-w-[min(24rem,90vw)] bg-card border-white/10 text-white" sideOffset={4}>
                      <SelectGroup>
                        <SelectLabel className="text-white/70">Mijozlar</SelectLabel>
                        {(clients ?? []).map((c) => {
                          const label = c.company?.trim() ? `${c.name} (${c.company})` : c.name;
                          return (
                            <SelectItem key={`client-${c.id}`} value={`client-${c.id}`} className="text-white focus:bg-white/10 focus:text-white whitespace-normal break-words">
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-white/70">Kompaniyalar</SelectLabel>
                        {(companies ?? []).map((co) => (
                          <SelectItem key={`company-${co.id}`} value={`company-${co.id}`} className="text-white focus:bg-white/10 focus:text-white whitespace-normal break-words">
                            {co.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Turi</label>
                  <select name="type" defaultValue={editingProject?.type} required className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="google_sheets" className="text-black">Google Sheets</option>
                    <option value="web" className="text-black">Web-sayt</option>
                    <option value="bot" className="text-black">Telegram Bot</option>
                    <option value="design" className="text-black">Dizayn</option>
                    <option value="tolov_tizimlari" className="text-black">To&apos;lov tizimlari</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Byudjet valyutasi</label>
                  <select name="currency" defaultValue={editingProject?.currency || "UZS"} className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="UZS" className="text-black">UZS (soʻm)</option>
                    <option value="USD" className="text-black">USD (dollar)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Byudjet</label>
                  <Input name="budget" defaultValue={editingProject?.budget} type="number" required className="glass-input text-white" placeholder="1000000 yoki 500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Boshlanish sanasi</label>
                  <div className="relative">
                    <Input ref={startDateInputRef} defaultValue={editingProject?.startDate ? format(new Date(editingProject.startDate), "yyyy-MM-dd") : ""} name="startDate" type="date" required className="glass-input text-white pr-10" />
                    <button type="button" onClick={() => startDateInputRef.current?.showPicker?.() ?? startDateInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-white focus:outline-none" aria-label="Sana tanlash">
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Tugash sanasi (muddat)</label>
                  <div className="relative">
                    <Input ref={deadlineDateInputRef} defaultValue={editingProject?.deadlineDate ? format(new Date(editingProject.deadlineDate), "yyyy-MM-dd") : ""} name="deadlineDate" type="date" required className="glass-input text-white pr-10" />
                    <button type="button" onClick={() => deadlineDateInputRef.current?.showPicker?.() ?? deadlineDateInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-white focus:outline-none" aria-label="Sana tanlash">
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Qo&apos;shimcha nimalar kerakligi</label>
                <textarea name="additionalRequirements" defaultValue={editingProject?.additionalRequirements} rows={2} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Qoʻshimcha talablar, resurslar..." />
              </div>
              <div>
                <label className="text-sm font-medium text-white/70 mb-1 block">Ustunlik</label>
                <select name="priority" defaultValue={editingProject?.priority || "medium"} className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="high" className="text-black">Yuqori</option>
                  <option value="medium" className="text-black">Oʻrta</option>
                  <option value="low" className="text-black">Past</option>
                </select>
              </div>
              <Button type="submit" disabled={createProject.isPending} className="w-full mt-4 bg-primary hover:bg-primary/90 text-background font-bold h-12 rounded-xl">
                {createProject.isPending ? "Yuborilmoqda..." : (editingProject ? "Yangilash" : "Loyiha Yaratish")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </AnimatePresence>

      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="glass-panel border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Loyihani o'chirish</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Haqiqatan ham ushbu loyihani o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi va barcha bog'langan ma'lumotlar (hisob-fakturalar, vazifalar) ham o'chib ketadi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 text-white hover:bg-white/10 border-white/10">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-white">O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeProjects.map((project, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={project.id}
            >
              <div className="relative h-full group">
                <div className="glass-panel rounded-3xl h-full flex flex-col hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] transition-all duration-500 border border-white/5 hover:border-primary/30 overflow-hidden relative">
                  {/* Absolute overlay link for the entire card */}
                  <Link href={`/projects/${project.id}`} className="absolute z-10 inset-0 focus:outline-none" />

                  {/* Top glowing orb effect */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-colors duration-700" />

                  {/* Card Content Wrapper */}
                  <div className="p-6 flex flex-col h-full flex-1 relative z-20 pointer-events-none">

                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="relative p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-500 transform group-hover:scale-110">
                            {getStatusIcon(project.status)}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/10 text-white/70 uppercase tracking-widest border border-white/5">
                              {typeLabel(project.type)}
                            </span>
                            {(project as any).priority && (
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest border ${(project as any).priority === 'high' ? 'bg-destructive/20 text-destructive border-destructive/20' :
                                (project as any).priority === 'low' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                                  'bg-amber-500/20 text-amber-400 border-amber-500/20'
                                }`}>
                                {((project as any).priority === "high" && "Yuqori") || ((project as any).priority === "low" && "Past") || "Oʻrta"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-5">
                      {/* Progress Bar Container */}
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-white/40 font-medium uppercase tracking-wider">Progress</span>
                          <span className="text-primary font-bold">{project.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                          {/* Animated Progress Bar width changing on load */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] rounded-full animate-shimmer"
                          />
                          {/* Inner glowing pulse based on progress */}
                          <div
                            className="absolute top-0 left-0 bottom-0 bg-primary/30 blur-sm rounded-full"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex justify-between items-end pt-5 border-t border-white/5 mt-5">
                        <div className="space-y-1">
                          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Tugash muddati</p>
                          <div className="flex items-center gap-2 text-white/80">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span className="text-sm font-semibold">
                              {project.deadlineDate && isValidDate(new Date(project.deadlineDate)) ? format(new Date(project.deadlineDate), 'dd.MM.yyyy') : 'Belgilanmagan'}
                            </span>
                          </div>
                        </div>

                        {/* Actions integrated in the row but with pointer-events-auto */}
                        {isAdmin && (
                          <div className="flex gap-2 pointer-events-auto">
                            <button
                              onClick={(e) => handleEditClick(project, e)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/20 text-white/50 hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/20 group/btn"
                              title="Tahrirlash"
                            >
                              <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(project.id, e)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-destructive/20 text-white/50 hover:text-destructive transition-all duration-300 border border-transparent hover:border-destructive/20 group/btn"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {activeProjects.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Briefcase className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Loyihalar yo'q</h3>
              <p className="text-muted-foreground max-w-md">Sizda hozircha hech qanday loyiha mavjud emas. Yangi loyiha yaratish orqali ishingizni boshlang.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Loyiha Nomi</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Muddat</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Progress</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-white/40">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeProjects.map((project) => (
                <tr key={project.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/projects/${project.id}`}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="p-2.5 rounded-xl bg-white/5 text-primary/70 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-primary transition-colors">{project.name}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">{typeLabel(project.type)}</p>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(project.status)}
                      <span className="text-xs font-medium text-white/70">{project.status === 'completed' ? 'Tugallangan' : project.status === 'delayed' ? 'Kechikkan' : 'Jarayonda'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white/80">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-primary/50" />
                      {project.deadlineDate && isValidDate(new Date(project.deadlineDate)) ? format(new Date(project.deadlineDate), 'dd.MM.yyyy') : 'Belgilanmagan'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                        {/* Animated progress bar fill for list view */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute top-0 left-0 bottom-0 bg-primary/80 rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold text-primary">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEditClick(project, e)} className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-white/50 hover:text-primary transition-all">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteClick(project.id, e)} className="p-2 rounded-lg bg-white/5 hover:bg-destructive/20 text-white/50 hover:text-destructive transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {activeProjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40 font-medium">
                    Loyihalar mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout >
  );
}
