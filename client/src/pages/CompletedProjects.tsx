import { AppLayout } from "@/components/layout/AppLayout";
import { useProjects } from "@/hooks/use-projects";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";
import { format } from "date-fns";
import { CheckCircle, ChevronRight, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { riskLabel, typeLabel } from "@/lib/uz";

export default function CompletedProjects() {
  const { data: allProjects, isLoading } = useProjects();
  const projects = (allProjects || []).filter((p) => p.status === "completed");

  if (isLoading) return <AppLayout><LoadingSpinner message="Tugallangan loyihalar yuklanmoqda..." /></AppLayout>;

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/projects">
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white cursor-pointer mb-4">
            <ChevronRight className="w-4 h-4 rotate-180" /> Loyihalar
          </span>
        </Link>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Tugallangan loyihalar</h1>
        <p className="text-muted-foreground">Barcha tugallangan loyihalar ro'yxati.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={project.id}
          >
            <Link href={`/projects/${project.id}`} className="block h-full">
              <div className="glass-panel rounded-2xl p-6 h-full flex flex-col hover:-translate-y-1 hover:shadow-[0_10px_40px_rgba(34,197,94,0.15)] transition-all duration-300 border border-white/5 hover:border-emerald-500/30 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-emerald-300 transition-colors">{project.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/10 text-white/70 uppercase tracking-wider">
                          {typeLabel(project.type)}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                          Tugallangan
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-emerald-400 transition-colors" />
                </div>

                <div className="mt-auto space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Jarayon</span>
                      <span className="text-emerald-400 font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-0.5">Muddat</p>
                      <p className="text-white font-medium">{format(new Date(project.deadlineDate), "dd.MM.yyyy")}</p>
                    </div>
                    <div className="text-sm text-right">
                      <p className="text-muted-foreground text-xs mb-0.5">Xavf</p>
                      <p className={`font-bold ${project.riskLevel === "HIGH" ? "text-destructive" : project.riskLevel === "MEDIUM" ? "text-orange-400" : "text-emerald-400"}`}>
                        {riskLabel(project.riskLevel)}
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
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400/50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tugallangan loyihalar yo'q</h3>
            <p className="text-muted-foreground max-w-md">Loyihalarni tugallanganda ular shu yerda ko'rinadi.</p>
            <Link href="/projects">
              <span className="inline-flex items-center gap-2 mt-4 text-primary hover:underline">
                <Briefcase className="w-4 h-4" /> Loyihalar
              </span>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
