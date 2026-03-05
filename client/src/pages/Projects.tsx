import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useCompanies } from "@/hooks/use-companies";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Plus, ChevronRight, AlertTriangle, CheckCircle, Clock, Briefcase, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { riskLabel, typeLabel } from "@/lib/uz";

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { data: companies } = useCompanies();
  const createProject = useCreateProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string>(""); // "client-1" yoki "company-2"
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const deadlineDateInputRef = useRef<HTMLInputElement>(null);

  const activeProjects = (projects || []).filter((p) => p.status !== "completed");

  if (isLoading) return <AppLayout><LoadingSpinner message="Loyihalar yuklanmoqda..." /></AppLayout>;

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
      alert("Iltimos, sana maydonlariga toʻgʻri sana kiriting (masalan: 25.02.2026 yoki kalendar orqali tanlang).");
      return;
    }
    if (deadlineDate < startDate) {
      alert("Tugash sanasi boshlanish sanasidan keyin boʻlishi kerak.");
      return;
    }
    try {
      const isClient = selectedParty.startsWith("client-");
      const isCompany = selectedParty.startsWith("company-");
      const clientId = isClient ? Number(selectedParty.replace("client-", "")) : undefined;
      const companyId = isCompany ? Number(selectedParty.replace("company-", "")) : undefined;
      await createProject.mutateAsync({
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
      });
      setIsDialogOpen(false);
      setSelectedParty("");
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Saqlash muvaffaqiyatsiz boʻldi.";
      alert(msg);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Loyihalar</h1>
          <p className="text-muted-foreground">Barcha loyihalarni boshqarish markazi.</p>
        </div>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/80 text-background font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 rounded-xl">
                <Plus className="w-5 h-5 mr-2" />
                Yangi Loyiha
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-white">Yangi loyiha yaratish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Nomi</label>
                  <Input name="name" required className="glass-input text-white" placeholder="Masalan: Veb-sayt dizayni" />
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Ishi nimalar qilish kerakligi haqida ma&apos;lumot</label>
                  <textarea name="description" rows={3} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Loyihada qanday ishlar bajarilishi kerak..." />
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
                    <select name="type" required className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
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
                    <select name="currency" className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <option value="UZS" className="text-black">UZS (soʻm)</option>
                      <option value="USD" className="text-black">USD (dollar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1 block">Byudjet</label>
                    <Input name="budget" type="number" required className="glass-input text-white" placeholder="1000000 yoki 500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1 block">Boshlanish sanasi</label>
                    <div className="relative">
                      <Input ref={startDateInputRef} name="startDate" type="date" required className="glass-input text-white pr-10" />
                      <button type="button" onClick={() => startDateInputRef.current?.showPicker?.() ?? startDateInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-white focus:outline-none" aria-label="Sana tanlash">
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-1 block">Tugash sanasi (muddat)</label>
                    <div className="relative">
                      <Input ref={deadlineDateInputRef} name="deadlineDate" type="date" required className="glass-input text-white pr-10" />
                      <button type="button" onClick={() => deadlineDateInputRef.current?.showPicker?.() ?? deadlineDateInputRef.current?.click()} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-white/50 hover:text-white focus:outline-none" aria-label="Sana tanlash">
                        <Calendar className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Qo&apos;shimcha nimalar kerakligi</label>
                  <textarea name="additionalRequirements" rows={2} className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Qoʻshimcha talablar, resurslar..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1 block">Ustunlik</label>
                  <select name="priority" className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="high" className="text-black">Yuqori</option>
                    <option value="medium" className="text-black">Oʻrta</option>
                    <option value="low" className="text-black">Past</option>
                  </select>
                </div>
                <Button type="submit" disabled={createProject.isPending} className="w-full mt-4 bg-primary hover:bg-primary/90 text-background">
                  {createProject.isPending ? "Yaratilmoqda..." : "Saqlash"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {activeProjects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={project.id}
          >
            <Link href={`/projects/${project.id}`} className="block h-full">
              <div className="glass-panel rounded-2xl p-6 h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(0,240,255,0.15)] transition-all duration-300 border border-white/5 hover:border-primary/30 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/10 transition-colors">
                      {getStatusIcon(project.status)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{project.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
                          {typeLabel(project.type)}
                        </span>
                        {(project as { priority?: string }).priority && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                            {((project as { priority: string }).priority === "high" && "Yuqori") || ((project as { priority: string }).priority === "low" && "Past") || "Oʻrta"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                </div>

                <div className="mt-auto space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Jarayon</span>
                      <span className="text-white font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-0.5">Muddat</p>
                      <p className="text-white font-medium">{format(new Date(project.deadlineDate), 'dd.MM.yyyy')}</p>
                    </div>
                    <div className="text-sm text-right">
                      <p className="text-muted-foreground text-xs mb-0.5">Xavf</p>
                      <p className={`font-bold ${project.riskLevel === 'HIGH' ? 'text-destructive' : project.riskLevel === 'MEDIUM' ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {riskLabel(project.riskLevel)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
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
    </AppLayout>
  );
}
