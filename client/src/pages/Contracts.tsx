import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollText, Plus, Trash2, Calendar, DollarSign, User, Briefcase, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContracts } from "@/hooks/use-contracts";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

export default function Contracts() {
  const { contracts, isLoading, createContract, deleteContract } = useContracts();
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const data = {
      contractNumber: fd.get("contractNumber") as string,
      title: fd.get("title") as string,
      clientId: fd.get("clientId") ? Number(fd.get("clientId")) : undefined,
      projectId: fd.get("projectId") ? Number(fd.get("projectId")) : undefined,
      amount: fd.get("amount") as string,
      currency: (fd.get("currency") as string) || "UZS",
      startDate: new Date(fd.get("startDate") as string),
      endDate: new Date(fd.get("endDate") as string),
      description: fd.get("description") as string,
      status: "active",
    };

    try {
      await createContract.mutateAsync(data as any);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Haqiqatan ham ushbu shartnomani o'chirmoqchimisiz?")) {
      await deleteContract.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Shartnomalar yuklanmoqda..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-black text-white tracking-tight mb-2">Shartnomalar</h1>
          <p className="text-white/50 font-medium">Mijozlar bilan tuzilgan rasmiy hujjatlar va kelishuvlar.</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-background px-8 rounded-2xl font-black h-12 shadow-lg shadow-primary/20 transition-all active:scale-95">
                <Plus className="w-5 h-5 mr-2 stroke-[3px]" /> Yangi shartnoma
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/10 max-w-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  Yangi shartnoma yaratish
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Shartnoma Raqami</label>
                    <Input name="contractNumber" required placeholder="Masalan: SH-2026/001" className="glass-input h-12 text-white font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Nomi / Mavzusi</label>
                    <Input name="title" required placeholder="Loyiha ishlab chiqish bo'yicha..." className="glass-input h-12 text-white font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Mijoz</label>
                    <select name="clientId" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="" className="text-black">Mijozni tanlang</option>
                      {clients?.map((c) => (
                        <option key={c.id} value={c.id} className="text-black">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Loyiha</label>
                    <select name="projectId" className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all">
                      <option value="" className="text-black">Loyihani tanlang</option>
                      {projects?.filter(p => !p.status || p.status !== "completed").map((p) => (
                        <option key={p.id} value={p.id} className="text-black">{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Summa</label>
                    <div className="relative">
                      <Input name="amount" type="number" required placeholder="0" className="glass-input h-12 text-white font-bold pr-16" />
                      <select name="currency" className="absolute right-2 top-2 h-8 rounded-lg bg-white/10 border-0 text-white text-xs font-black outline-none px-2">
                        <option value="UZS">UZS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Boshlanishi</label>
                      <Input name="startDate" type="date" required className="glass-input h-12 text-white font-bold text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Tugashi</label>
                      <Input name="endDate" type="date" required className="glass-input h-12 text-white font-bold text-xs" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Qo'shimcha tafsilotlar</label>
                  <textarea name="description" rows={3} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none" placeholder="Shartnoma bo'yicha ixtiyoriy izoh..." />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-12 rounded-2xl border-white/10 text-white font-black hover:bg-white/5">
                    Bekor qilish
                  </Button>
                  <Button type="submit" disabled={createContract.isPending} className="flex-[2] h-12 rounded-2xl bg-primary text-background font-black shadow-lg shadow-primary/20">
                    {createContract.isPending ? <LoadingSpinner /> : "Saqlash"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {contracts.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[3rem] p-16 border border-white/5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <ScrollText className="w-12 h-12 text-primary relative" />
          </div>
          <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Shartnomalar mavjud emas</h3>
          <p className="text-white/40 max-w-md mx-auto mb-10 text-lg font-medium leading-relaxed">
            Hozircha tizimda hech qanday shartnoma mavjud emas. Birinchi shartnomani qo'shish uchun yuqoridagi tugmani bosing.
          </p>
          {isAdmin && (
            <Button onClick={() => setIsOpen(true)} variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-background px-10 rounded-2xl font-black h-12">
              Boshlash
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {contracts.map((contract, index) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-6 rounded-[2.5rem] border border-white/5 border-b-primary/30 hover:border-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
                  <ScrollText className="w-20 h-20" />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">№ {contract.contractNumber}</p>
                    <h3 className="text-xl font-black text-white leading-tight group-hover:text-primary transition-colors">{contract.title}</h3>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(contract.id)} className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg text-white/40">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Mijoz</p>
                      <p className="text-white font-bold">{clients?.find(c => c.id === contract.clientId)?.name || "Noma'lum"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg text-white/40">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Loyiha</p>
                      <p className="text-white font-bold">{projects?.find(p => p.id === contract.projectId)?.name || "Noma'lum"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Amalda
                      </p>
                      <p className="text-[11px] text-white/60 font-black tracking-tight italic">
                        {format(new Date(contract.startDate), "dd.MM.yyyy")} — {format(new Date(contract.endDate), "dd.MM.yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-black text-white">
                      {Number(contract.amount).toLocaleString(contract.currency === "USD" ? "en-US" : "uz-UZ")}
                      <span className="text-xs text-white/40 ml-1 font-bold">{contract.currency}</span>
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${contract.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/40 border border-white/10"}`}>
                    {contract.status === "active" ? "FAOL" : contract.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  );
}
