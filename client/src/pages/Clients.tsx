import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useClients, useCreateClient } from "@/hooks/use-clients";
import { useCompanies, useCreateCompany } from "@/hooks/use-companies";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Building2, Plus, Mail, Phone, Star, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Clients() {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { data: companies, isLoading: isCompaniesLoading } = useCompanies();
  const createClient = useCreateClient();
  const createCompany = useCreateCompany();
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const isLoading = isClientsLoading || isCompaniesLoading;
  if (isLoading) return <AppLayout><LoadingSpinner message="Yuklanmoqda..." /></AppLayout>;

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createClient.mutateAsync({
      name: formData.get("name") as string,
      company: formData.get("company") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    });
    setIsClientOpen(false);
  };

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createCompany.mutateAsync({
      name: formData.get("name") as string,
      responsibleTelegram: (formData.get("responsibleTelegram") as string) || undefined,
      additionalInfo: (formData.get("additionalInfo") as string) || undefined,
    });
    setIsCompanyOpen(false);
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Mijozlar bazasi</h1>
        <p className="text-muted-foreground">Kompaniyalar va mijozlar ro'yxati.</p>
      </div>

      {/* Kompaniyalar */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Kompaniyalar</h2>
          {isAdmin && (
            <Dialog open={isCompanyOpen} onOpenChange={setIsCompanyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 mr-2" />
                  Yangi Kompaniya
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader><DialogTitle className="text-white">Yangi kompaniya qo'shish</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateCompany} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Kompaniya nomi</label>
                    <Input name="name" required className="glass-input text-white" placeholder="Masalan: TechCorp LLC" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Mas'ul xodim Telegrami</label>
                    <Input name="responsibleTelegram" className="glass-input text-white" placeholder="@username yoki +998901234567" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Qo'shimcha ma'lumot</label>
                    <textarea name="additionalInfo" rows={3} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Manzil, INN, shartnoma bo'yicha eslatmalar..." />
                  </div>
                  <Button type="submit" disabled={createCompany.isPending} className="w-full bg-primary text-background mt-4">
                    Saqlash
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies?.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/20 transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{company.name}</h3>
                </div>
              </div>
              {company.responsibleTelegram && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  <Send className="w-4 h-4 text-white/30" />
                  <span className="text-white/80">{company.responsibleTelegram}</span>
                </div>
              )}
              {company.additionalInfo && (
                <p className="text-sm text-white/70 mt-2 line-clamp-3">{company.additionalInfo}</p>
              )}
            </motion.div>
          ))}
          {(!companies || companies.length === 0) && (
            <p className="text-muted-foreground col-span-full">Hali kompaniya qo'shilmagan. &quot;Yangi Kompaniya&quot; orqali qo'shing.</p>
          )}
        </div>
      </section>

      {/* Mijozlar */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Mijozlar</h2>
          {isAdmin && (
            <Dialog open={isClientOpen} onOpenChange={setIsClientOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/80 text-background font-bold shadow-lg shadow-primary/25 rounded-xl">
                  <Plus className="w-5 h-5 mr-2" />
                  Yangi Mijoz
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader><DialogTitle className="text-white">Yangi mijoz qo'shish</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateClient} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Mijoz Ismi</label>
                    <Input name="name" required className="glass-input text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 block mb-1">Kompaniya</label>
                    <Input name="company" className="glass-input text-white" placeholder="Yoki yakka tartibdagi" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Email</label>
                      <Input name="email" type="email" className="glass-input text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-white/70 block mb-1">Telefon</label>
                      <Input name="phone" className="glass-input text-white" />
                    </div>
                  </div>
                  <Button type="submit" disabled={createClient.isPending} className="w-full bg-primary text-background mt-4">
                    Saqlash
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients?.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden"
            >
              {client.isBlacklisted && <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/20 rotate-45 translate-x-8 -translate-y-8 blur-xl"></div>}

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                  <Building2 className="w-6 h-6 text-white/70 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{client.name}</h3>
                  <p className="text-sm text-primary/80">{client.company || "Yakka tartibdagi"}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-white/30" />
                    <span className="text-white/80 truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-white/30" />
                    <span className="text-white/80">{client.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  <span className="font-bold text-sm">{client.score} ball</span>
                </div>
                {client.isBlacklisted && <span className="text-xs font-bold text-destructive uppercase px-2 py-1 bg-destructive/10 rounded-md">Qora ro'yxatda</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
