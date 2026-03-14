import type { Express } from "express";
import { storage } from "../storage";
import { insertSalarySchema } from "@shared/schema";
import { z } from "zod";

export async function registerEmployeeRoutes(app: Express, isAuthenticated: any, isAdmin: any) {
    // --- Employees ---
    app.get("/api/employees", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin ko'ra oladi" });
            const { authStorage } = await import("../replit_integrations/auth/storage");
            const employees = await authStorage.getEmployees();
            res.json(employees.map(e => ({ id: e.id, username: e.username, firstName: e.firstName, lastName: e.lastName, role: e.role })));
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    });

    app.post("/api/register-employee", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin xodim qo'sha oladi" });
            const { username, password, firstName, lastName } = req.body;
            if (!username || !password) return res.status(400).json({ message: "Login va parol kiritish shart" });

            const bcrypt = await import("bcrypt");
            const hash = await bcrypt.hash(password, 10);
            const { authStorage } = await import("../replit_integrations/auth/storage");
            const newEmployee = await authStorage.createEmployee(username, hash, firstName, lastName);
            res.status(201).json({ id: newEmployee.id, username: newEmployee.username, role: newEmployee.role });
        } catch (err) {
            if (err instanceof Error && err.message.includes("band")) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: "Xodim qo'shishda xato" });
            }
        }
    });

    app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin ko'ra oladi" });
            const { authStorage } = await import("../replit_integrations/auth/storage");
            const emp = await authStorage.getUser(req.params.id as string);
            if (!emp) return res.status(404).json({ message: "Xodim topilmadi" });
            res.json({ id: emp.id, username: emp.username, firstName: emp.firstName, lastName: emp.lastName, role: emp.role, companyRole: emp.companyRole });
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    });

    app.put("/api/employees/:id", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin tahrirlay oladi" });
            const { authStorage } = await import("../replit_integrations/auth/storage");
            const { username, password, firstName, lastName, companyRole } = req.body;

            const updates: any = {};
            if (firstName !== undefined) updates.firstName = firstName;
            if (lastName !== undefined) updates.lastName = lastName;
            if (companyRole !== undefined) updates.companyRole = companyRole;
            if (username) updates.username = username;
            if (password) {
                const bcrypt = await import("bcrypt");
                updates.passwordHash = await bcrypt.hash(password, 10);
            }

            const updatedUser = await authStorage.updateEmployee(req.params.id as string, updates);
            if (!updatedUser) return res.status(404).json({ message: "Xodim topilmadi" });
            res.json({ id: updatedUser.id, username: updatedUser.username, firstName: updatedUser.firstName, lastName: updatedUser.lastName, role: updatedUser.role, companyRole: updatedUser.companyRole });
        } catch (err) {
            res.status(500).json({ message: "Xodim tahrirlashda xato" });
        }
    });

    app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin o'chira oladi" });
            const { authStorage } = await import("../replit_integrations/auth/storage");
            await authStorage.deleteEmployee(req.params.id as string);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ message: "Xodim o'chirishda xato" });
        }
    });

    app.get("/api/employees/:id/tasks", isAuthenticated, async (req, res) => {
        try {
            if ((req.user as any)?.role !== "admin") return res.status(403).json({ message: "Faqat admin ko'ra oladi" });
            const tasks = await storage.getTasksByAssignee(req.params.id as string);
            res.json(tasks);
        } catch (err) {
            res.status(500).json({ message: "Server error" });
        }
    });

    // --- Salaries ---
    app.get("/api/salaries", isAuthenticated, async (req, res) => {
        try {
            const user = req.user as any;
            const isAdminUser = user.role === "admin";
            const month = req.query.month ? parseInt(req.query.month as string) : undefined;
            const year = req.query.year ? parseInt(req.query.year as string) : undefined;
            const userId = isAdminUser ? undefined : user.id;

            const results = await storage.getSalaries(month, year, userId);
            res.json(results);
        } catch (err) {
            res.status(500).json({ message: "Oyliklar yuklashda xato" });
        }
    });

    app.post("/api/salaries", isAuthenticated, isAdmin, async (req, res) => {
        try {
            const data = insertSalarySchema.parse(req.body);
            const result = await storage.createSalary(data);
            res.status(201).json(result);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Oylik saqlashda xato" });
        }
    });

    app.put("/api/salaries/:id", isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id as string);
            const updated = await storage.updateSalary(id, req.body);
            if (!updated) return res.status(404).json({ message: "Topilmadi" });
            res.json(updated);
        } catch (err) {
            res.status(500).json({ message: "Oylik yangilashda xato" });
        }
    });

    app.delete("/api/salaries/:id", isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = parseInt(req.params.id as string);
            await storage.deleteSalary(id);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ message: "Oylik o'chirishda xato" });
        }
    });
}
