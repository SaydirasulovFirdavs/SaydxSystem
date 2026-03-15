import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { motion, AnimatePresence } from "framer-motion";

function GlobalLoader() {
  return (
    <div className="min-h-screen relative bg-[#030712] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[60px] pointer-events-none" />

      {/* Grid Pattern Background overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Main Logo Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, filter: "blur(20px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* Logo Glow Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 rounded-full border border-blue-500/20 border-t-blue-400/80 border-b-cyan-400/80 blur-[2px]"
          />

          <img
            src="/logo.png"
            alt="SAYD.X"
            className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-contain drop-shadow-[0_0_30px_rgba(0,180,255,0.4)] relative z-10"
          />
        </motion.div>

        {/* Loading Bar */}
        <div className="mt-12 flex flex-col items-center transition-all duration-700">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden relative"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-4 text-[10px] md:text-xs font-mono tracking-[0.3em] text-cyan-400/80 uppercase select-none"
          >
            Sistemaga ulanmoqda...
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}


import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import CompletedProjects from "@/pages/CompletedProjects";
import ProjectDetails from "@/pages/ProjectDetails";
import Finance from "@/pages/Finance";
import Invoices from "@/pages/Invoices";
import Clients from "@/pages/Clients";
import Analytics from "@/pages/Analytics";
import Calendar from "@/pages/Calendar";
import Login from "@/pages/Login";
import Employees from "@/pages/Employees";
import EmployeeDetails from "@/pages/EmployeeDetails";
import MyTasks from "@/pages/MyTasks";

import Salaries from "@/pages/Salaries";
import Contracts from "@/pages/Contracts";
import VerifyInvoice from "@/pages/VerifyInvoice";
import VerifyContract from "@/pages/VerifyContract";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const isPublicRoute = location.startsWith("/verify-invoice") || location.startsWith("/verify-contract");
  
  // /login sahifasida darhol formani ko'rsatish (animatsiya va kutishsiz)
  if (location === "/login") return <Login />;

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!isAuthenticated && !isPublicRoute) {
    window.location.href = "/login";
    return null;
  }

  const isAdmin = user?.role === "admin";

  return (
    <Switch>
      {isAdmin && <Route path="/" component={Dashboard} />}
      {!isAdmin && <Route path="/" component={() => { window.location.href = "/projects"; return null; }} />}

      <Route path="/projects" component={Projects} />
      <Route path="/projects/completed" component={CompletedProjects} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/tasks" component={MyTasks} />
      <Route path="/clients" component={Clients} />
      <Route path="/calendar" component={Calendar} />

      {isAdmin && <Route path="/finance" component={Finance} />}
      {isAdmin && <Route path="/invoices" component={Invoices} />}
      {isAdmin && <Route path="/contracts" component={Contracts} />}
      {isAdmin && <Route path="/analytics" component={Analytics} />}
      {isAdmin && <Route path="/employees" component={Employees} />}
      {isAdmin && <Route path="/employees/:id" component={EmployeeDetails} />}
      <Route path="/salaries" component={Salaries} />
      <Route path="/verify-invoice/:token" component={VerifyInvoice} />
      <Route path="/verify-contract" component={VerifyContract} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
