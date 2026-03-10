import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Import modular routes
import { registerProjectRoutes } from "./routes/projects";
import { registerFinanceRoutes } from "./routes/finance";
import { registerEmployeeRoutes } from "./routes/employees";
import { registerAnalyticsRoutes } from "./routes/analytics";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // 1. Setup Authentication
  const { isAuthenticated, isAdmin } = await setupAuth(app);

  // 2. Logging & API Monitoring middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: any;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse && (res.statusCode >= 400 || path.includes("/api/salaries"))) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        console.log(logLine);
      }
    });
    next();
  });

  // 3. Register Auth & Modular Routes
  registerAuthRoutes(app);
  registerProjectRoutes(app, isAuthenticated, isAdmin);
  registerFinanceRoutes(app, isAuthenticated, isAdmin);
  await registerEmployeeRoutes(app, isAuthenticated, isAdmin);
  registerAnalyticsRoutes(app, isAuthenticated);

  // --- Clients ---
  app.get(api.clients.list.path, isAuthenticated, async (req, res) => {
    const cls = await storage.getClients();
    res.json(cls);
  });

  app.post(api.clients.create.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // --- Companies ---
  app.get(api.companies.list.path, isAuthenticated, async (req, res) => {
    const cos = await storage.getCompanies();
    res.json(cos);
  });

  app.post(api.companies.create.path, isAuthenticated, isAdmin, async (req, res) => {
    try {
      const input = api.companies.create.input.parse(req.body);
      const company = await storage.createCompany(input);
      res.status(201).json(company);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // --- AI Risk Analyzer (kept here for simplicity or moved if desired) ---
  app.post(api.ai.analyzeRisk.path, isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(Number(req.params.id));
      if (!project) return res.status(404).json({ message: "Project not found" });

      const riskLevel = "MEDIUM";
      const recommendation = "To'lovlar kechikmoqda. Mijoz bilan bog'lanish tavsiya etiladi.";

      await storage.updateProject(project.id, { riskLevel } as any);
      res.json({ riskLevel, recommendation });
    } catch (err) {
      res.status(500).json({ message: "AI Risk analysis failed" });
    }
  });

  return httpServer;
}
