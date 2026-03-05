import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

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

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  // /login sahifasida darhol formani ko'rsatish (animatsiya va kutishsiz)
  if (location === "/login") return <Login />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center overflow-hidden">
        <img
          src="/logo.png"
          alt="SAYD.X"
          className="w-48 h-48 rounded-2xl object-contain"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
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
      {isAdmin && <Route path="/analytics" component={Analytics} />}
      {isAdmin && <Route path="/employees" component={Employees} />}
      {isAdmin && <Route path="/employees/:id" component={EmployeeDetails} />}

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
