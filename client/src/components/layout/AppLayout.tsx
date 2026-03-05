import { ReactNode, useEffect, useState } from "react";
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
  UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (typeof document !== "undefined" && document.documentElement.classList.contains("light") ? "light" : "dark"));
  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

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
      { name: "Analitika", path: "/analytics", icon: BarChart3 },
    ] : []),
    { name: "Kalendar", path: "/calendar", icon: Calendar },
    ...(isAdmin ? [{ name: "Xodimlar", path: "/employees", icon: UserCog }] : []),
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
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 glass-panel border-white/10 p-0" align="start">
              <div className="p-2 border-b border-white/5 font-medium text-sm text-white">Ogohlantirishlar</div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-3 text-muted-foreground text-sm">Ogohlantirishlar yo'q</p>
                ) : (
                  notifications.slice(0, 15).map((a: { projectId: number; title: string; message: string; type: string }) => (
                    <Link
                      key={`${a.projectId}-${a.type}-${a.message}`}
                      href={`/projects/${a.projectId}`}
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      <div className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                        <p className="text-sm font-medium text-white truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                      </div>
                    </Link>
                  ))
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

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto pt-16 lg:pt-0 relative z-10">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
