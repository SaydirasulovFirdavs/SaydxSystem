import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Wallet,
  LogOut,
  Menu,
  X,
  BarChart3,
  Calendar,
  Bell,
  Sun,
  Moon,
  CheckCircle,
  FileText,
  UserCog,
  AlertTriangle,
  Clock,
  AlertOctagon,
  ScrollText
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface AppLayoutProps {
  children: ReactNode;
}

// Module-level flag — resets on full page reload (F5) but persists across React navigations
let _topBannerShown = false;

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (typeof document !== "undefined" && document.documentElement.classList.contains("light") ? "light" : "dark"));
  const isEmployee = user && (user as any).role !== "admin";

  // Fetch notifications for all users (admin sees all project alerts, employees see theirs)
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 1000 * 60 * 5,
  });

  const [criticalAlert, setCriticalAlert] = useState<any>(null);

  useEffect(() => {
    // DIQQAT modal is only for employees — never show to admins
    if (!isEmployee) return;
    if (!notifications?.length) return;
    const alert = notifications.find((n: any) => {
      if (n.type === "deadline_critical") {
        const key = `critical-alert-${n.projectId}-${n.hoursLeft}`;
        return !localStorage.getItem(key);
      }
      return false;
    });

    if (alert) {
      setCriticalAlert({ ...alert, key: `critical-alert-${alert.projectId}-${alert.hoursLeft}` });
    }
  }, [notifications, isEmployee]);

  const handleAcknowledgeCritical = () => {
    if (criticalAlert) {
      localStorage.setItem(criticalAlert.key, "true");
      setCriticalAlert(null);
    }
  };

  // Top banner: show the most urgent alert on page load for everyone
  const [topBanner, setTopBanner] = useState<any>(null);
  const [topBannerVisible, setTopBannerVisible] = useState(false);

  useEffect(() => {
    if (!notifications?.length) return;
    if (_topBannerShown) return; // already shown — module-level flag persists across route changes
    const priority = ["deadline_critical", "deadline_today", "deadline_overdue", "payment_alert", "deadline_reminder"];
    const best = notifications.slice().sort((a: any, b: any) =>
      priority.indexOf(a.type) - priority.indexOf(b.type)
    )[0];
    if (!best) return;
    _topBannerShown = true;
    setTopBanner(best);
    setTopBannerVisible(true);
    const timer = setTimeout(() => setTopBannerVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try { localStorage.setItem("s-ubos-theme", theme); } catch (_) { }
  }, [theme]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("s-ubos-theme") as "dark" | "light" | null;
      if (saved) setTheme(saved);
    } catch (_) { }
  }, []);

  const isAdmin = user?.role === "admin";

  const navItems = [
    ...(isAdmin ? [{ name: "Boshqaruv paneli", path: "/", icon: LayoutDashboard }] : []),
    { name: "Loyihalar", path: "/projects", icon: Briefcase },
    { name: "Vazifalar", path: "/tasks", icon: CheckCircle },
    { name: "Tugallangan loyihalar", path: "/projects/completed", icon: CheckCircle },
    { name: "Mijozlar", path: "/clients", icon: Users },
    ...(isAdmin ? [
      { name: "Moliya", path: "/finance", icon: Wallet },
      { name: "Hisob-faktura", path: "/invoices", icon: FileText },
      { name: "Shartnoma", path: "/contracts", icon: ScrollText },
      { name: "Analitika", path: "/analytics", icon: BarChart3 },
    ] : []),
    { name: "Kalendar", path: "/calendar", icon: Calendar },
    { name: "Oylik", path: "/salaries", icon: Wallet },
    ...(isAdmin ? [
      { name: "Xodimlar", path: "/employees", icon: UserCog },
    ] : []),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-2xl border-r border-white/5">
      <div className="p-6 flex items-center justify-center">
        <img
          src="/logo.png"
          alt="S-UBOS"
          className="w-24 h-24 rounded-3xl object-contain"
        />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive =
            item.path === "/projects"
              ? location === "/projects" || (location.startsWith("/projects/") && location !== "/projects/completed")
              : item.path === "/projects/completed"
                ? location === "/projects/completed"
                : location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className="block">
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
                }
              `}>
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "opacity-70"}`} />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4">
          {/* Notification Bell — visible to everyone */}
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white transition-all hover:bg-white/5 rounded-xl">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute 1 top-0 right-0 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center border border-background shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 glass-panel border border-white/10 p-0 rounded-2xl shadow-2xl" align="start" sideOffset={8}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20 rounded-t-2xl">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" /> Xabarnomalar
                </span>
                {notifications.length > 0 && (
                  <span className="text-xs font-semibold text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">{notifications.length} ta yangi</span>
                )}
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Bell className="w-8 h-8 text-white/10 mb-2" />
                    <p className="text-muted-foreground text-sm font-medium">Hozircha xabarnomalar yo'q</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {notifications.slice(0, 15).map((a: { projectId: number; title: string; message: string; type: string, date: string }) => {
                      const isOverdue = a.type === "deadline_overdue";
                      const isCritical = a.type === "deadline_critical";
                      const isToday = a.type === "deadline_today";
                      const isPayment = a.type === "payment_alert";

                      const Icon = isOverdue ? AlertTriangle : isCritical ? AlertOctagon : isToday ? Clock : isPayment ? Wallet : Calendar;
                      const colorClass = isOverdue ? "text-destructive bg-destructive/10" : isCritical ? "text-destructive bg-destructive/20 animate-pulse" : isToday ? "text-amber-400 bg-amber-400/10" : isPayment ? "text-emerald-400 bg-emerald-400/10" : "text-primary bg-primary/10";
                      const borderColor = isOverdue || isCritical ? "group-hover:border-destructive/30" : isToday ? "group-hover:border-amber-400/30" : isPayment ? "group-hover:border-emerald-400/30" : "group-hover:border-primary/30";

                      return (
                        <Link
                          key={`${a.projectId}-${a.type}-${a.message}`}
                          href={`/projects/${a.projectId}`}
                          onClick={() => setIsNotificationsOpen(false)}
                          className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-white/5 border border-transparent ${borderColor} group cursor-pointer`}
                        >
                          <div className={`p-2 rounded-lg mt-0.5 ${colorClass} transition-colors duration-300`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{a.title}</p>
                            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-destructive/80 font-medium' : isToday ? 'text-amber-400/80 font-medium' : 'text-white/50'}`}>
                              {a.message}
                            </p>
                            {a.date && (
                              <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest flex items-center gap-1">
                                Muddat: {format(new Date(a.date), 'dd.MM.yyyy')}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title={theme === "dark" ? "Yorugʻ rejim" : "Qorongʻu rejim"}>
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={user?.profileImageUrl || ""} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.firstName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Tizimdan chiqish
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full z-20 relative">
        <SidebarContent />
      </aside>

      {/* Mobile Header & Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel z-50 flex items-center justify-between px-4">
        <div className="flex-1 flex items-center justify-center">
          <img src="/logo.png" alt="S-UBOS" className="w-14 h-14 rounded-2xl object-contain" />
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden"
            >
              <SidebarContent />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Top Banner Notification — for ALL users on page load, once per reload */}
      <AnimatePresence>
        {topBannerVisible && topBanner && (() => {
          const isCriticalType = topBanner.type === "deadline_critical" || topBanner.type === "deadline_overdue";
          const isTodayType = topBanner.type === "deadline_today";
          const gradientClass = isCriticalType
            ? "from-red-950 via-red-900 to-rose-950"
            : isTodayType
              ? "from-amber-950 via-orange-900 to-amber-950"
              : "from-slate-950 via-slate-900 to-slate-950";
          const borderClass = isCriticalType
            ? "border-red-500/40"
            : isTodayType
              ? "border-amber-500/40"
              : "border-primary/30";
          const glowClass = isCriticalType
            ? "shadow-[0_4px_30px_rgba(239,68,68,0.35)]"
            : isTodayType
              ? "shadow-[0_4px_30px_rgba(245,158,11,0.35)]"
              : "shadow-[0_4px_20px_rgba(0,240,255,0.2)]";
          const accentColor = isCriticalType ? "text-red-400" : isTodayType ? "text-amber-400" : "text-primary";
          const iconBg = isCriticalType ? "bg-red-500/20 border-red-500/40" : isTodayType ? "bg-amber-500/20 border-amber-500/40" : "bg-primary/20 border-primary/40";
          const BannerIcon = isCriticalType ? AlertOctagon : isTodayType ? Clock : Bell;
          const label = isCriticalType ? "SHOSHILINCH" : isTodayType ? "BUGUN TUGAYDI" : "ESLATMA";

          return (
            <motion.div
              key="top-banner"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.7 }}
              className={`fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r ${gradientClass} border-b-2 ${borderClass} ${glowClass} backdrop-blur-xl`}
            >
              {/* Animated countdown progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 10, ease: "linear" }}
                style={{ transformOrigin: "left" }}
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${isCriticalType ? "bg-red-500" : isTodayType ? "bg-amber-500" : "bg-primary"}`}
              />

              <div className="flex items-center gap-4 px-5 py-4">
                {/* Pulsing icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${iconBg} ${isCriticalType ? "animate-pulse" : ""}`}>
                  <BannerIcon className={`w-5 h-5 ${accentColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="text-white font-bold text-base leading-tight truncate">{topBanner.title}</span>
                    <span className={`text-sm font-semibold ${accentColor} flex-shrink-0`}>{topBanner.message}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link
                    href={`/projects/${topBanner.projectId}`}
                    onClick={() => setTopBannerVisible(false)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isCriticalType ? "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30" : isTodayType ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30" : "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"} transition-all`}
                  >
                    Ko'rish →
                  </Link>
                  <button
                    onClick={() => setTopBannerVisible(false)}
                    className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Critical Alert Modal — employee only, never for admins */}
      <AnimatePresence>
        {isEmployee && criticalAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
              className="relative w-full max-w-lg glass-panel rounded-3xl p-8 border-2 border-destructive/50 shadow-[0_0_100px_rgba(239,68,68,0.4)] text-center overflow-hidden"
            >
              {/* Pulsing background glow */}
              <div className="absolute inset-0 bg-destructive/10 animate-pulse pointer-events-none" />

              <div className="relative z-10">
                <div className="mx-auto w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-bounce">
                  <AlertOctagon className="w-14 h-14 text-destructive drop-shadow-lg" />
                </div>

                <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
                  DIQQAT!
                </h2>
                <h3 className="text-2xl font-bold text-destructive mb-6">
                  {criticalAlert.message}
                </h3>

                <div className="bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
                  <p className="text-white/60 text-sm uppercase tracking-widest mb-1 font-semibold">Loyiha nomi</p>
                  <p className="text-xl text-white font-bold">{criticalAlert.title}</p>
                </div>

                <Button
                  onClick={handleAcknowledgeCritical}
                  className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold py-6 text-lg rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:shadow-[0_0_50px_rgba(239,68,68,0.8)] transition-all transform hover:scale-105"
                >
                  Tushundim
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto pt-16 lg:pt-0 relative z-10">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
