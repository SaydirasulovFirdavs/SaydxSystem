import { AppLayout } from "@/components/layout/AppLayout";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";
import { format } from "date-fns";
import { CheckCircle, ChevronRight, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { riskLabel, typeLabel } from "@/lib/uz";

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export default function CompletedProjects() {
  const { data: allProjects, isLoading } = useProjects();
  const projects = Array.isArray(allProjects) ? allProjects.filter((p) => p.status === "completed") : [];

  if (isLoading) return <AppLayout><LoadingSpinner message="Tugallangan loyihalar yuklanmoqda..." /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        <Link href="/projects" className="text-sm font-medium">Barcha loyihalar</Link>
      </div>

      <div className="glass-panel rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10 opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-display font-black text-white tracking-tight mb-2">Tugallangan Loyihalar</h1>
            <p className="text-white/50 font-medium">Muvaffaqiyatli yakunlangan barcha loyihalar arxivi.</p>
          </div>
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={project.id}
          >
            <Link href={`/projects/${project.id}`} className="block h-full group">
              <div className="glass-panel rounded-[2.5rem] p-8 h-full flex flex-col border border-white/5 hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <CheckCircle className="w-24 h-24 text-emerald-500" />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div className="flex flex-col gap-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 w-fit">
                      Tugallangan
                    </span>
                    <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight leading-tight">
                      {project.name}
                    </h3>
                  </div>
                  <div className="p-3 bg-white/5 rounded-2xl text-white/20 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all duration-300">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-auto space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/50 border border-white/10">
                      {typeLabel(project.type)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${project.riskLevel === 'HIGH' ? 'text-destructive bg-destructive/10' :
                        project.riskLevel === 'MEDIUM' ? 'text-orange-400 bg-orange-400/10' :
                          'text-emerald-400 bg-emerald-400/10'
                      }`}>
                      {riskLabel(project.riskLevel)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">Muvaffaqiyat</p>
                      <p className="text-lg font-black text-emerald-400">100%</p>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                      <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <p className="text-white/30 font-bold text-xs">Yopildi:</p>
                      <p className="text-white font-black text-sm">
                        {project.deadlineDate && isValidDate(new Date(project.deadlineDate)) ? format(new Date(project.deadlineDate), "dd.MM.yyyy") : 'Belgilanmagan'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-white/10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Hozircha tugallangan loyihalar yo&apos;q</h3>
            <p className="text-white/40 max-w-md font-medium">Bajarilgan loyihalar shu yerda muhrlanadi.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
