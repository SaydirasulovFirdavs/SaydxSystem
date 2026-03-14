import type { Express } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";

export function registerProjectRoutes(app: Express, isAuthenticated: any, isAdmin: any) {
    // --- Projects ---
    app.get(api.projects.list.path, isAuthenticated, async (req, res) => {
        const user = req.user as any;
        let projs: any[];
        if (user.role === "admin") {
            projs = await storage.getProjects();
        } else {
            projs = await storage.getProjectsForEmployee(user.id);
        }
        res.json(projs);
    });

    app.get(api.projects.get.path, isAuthenticated, async (req, res) => {
        const project = await storage.getProject(Number(req.params.id));
        if (!project) return res.status(404).json({ message: "Project not found" });
        res.json(project);
    });

    app.post(api.projects.create.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const input = api.projects.create.input.parse(req.body);
            const project = await storage.createProject(input);
            res.status(201).json(project);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Failed to create project" });
        }
    });

    app.put(api.projects.update.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const input = api.projects.update.input.parse(req.body);
            const project = await storage.updateProject(id, input);
            res.json(project);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Failed to update project" });
        }
    });

    app.delete(api.projects.delete.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid project ID" });
            await storage.deleteProject(id);
            res.status(204).end();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete project" });
        }
    });

    // --- Tasks ---
    app.get(api.tasks.list.path, isAuthenticated, async (req, res) => {
        const tasks = await storage.getTasksByProject(Number(req.params.projectId));
        res.json(tasks);
    });

    app.post(api.tasks.create.path, isAuthenticated, async (req, res) => {
        try {
            const body = api.tasks.create.input.extend({
                parentTaskId: z.coerce.number().optional(),
            }).parse(req.body);
            const { parentTaskId, ...rest } = body;
            const task = await storage.createTask({
                ...rest,
                projectId: Number(req.params.projectId),
                ...(parentTaskId != null && { parentTaskId }),
            });
            res.status(201).json(task);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Failed to create task" });
        }
    });

    app.put(api.tasks.update.path, isAuthenticated, async (req, res) => {
        try {
            const taskId = Number(req.params.id);
            const user = req.user as any;
            const input = api.tasks.update.input.parse(req.body);
            const current = await storage.getTask(taskId);
            if (!current) return res.status(404).json({ message: "Task not found" });

            // Ownership check: Admin can update any, Employee only their own tasks
            if (user.role !== "admin" && current.assigneeId !== user.id) {
                return res.status(403).json({ message: "Sizga tegishli bo'lmagan vazifani o'zgartira olmaysiz." });
            }

            const { id: _id, ...rest } = input as { id?: number; status?: string; reopenComment?: string; dueDate?: string | Date;[k: string]: unknown };
            const updates = { ...rest };
            const newStatus = (input.status ?? current.status) as string;
            const cur = current as { status: string; inProgressStartedAt?: Date; completedAt?: Date };
            if (newStatus === "in progress" && cur.status !== "in progress" && !cur.inProgressStartedAt) {
                (updates as { inProgressStartedAt?: Date }).inProgressStartedAt = new Date();
            }
            if (newStatus === "done") {
                (updates as { completedAt?: Date }).completedAt = new Date();
            }
            if (newStatus === "todo" && cur.status === "done") {
                (updates as { completedAt?: null; inProgressStartedAt?: null }).completedAt = null;
                (updates as { inProgressStartedAt?: null }).inProgressStartedAt = null;
            }
            if ((rest as { dueDate?: string }).dueDate !== undefined) {
                (updates as any).dueDate = rest.dueDate ? new Date(rest.dueDate as string) : null;
            }
            const updated = await storage.updateTask(taskId, updates as any);
            if (!updated) return res.status(404).json({ message: "Task not found" });
            res.json(updated);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Failed to update task" });
        }
    });

    app.delete(api.tasks.delete.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid task ID" });
            await storage.deleteTask(id);
            res.status(204).end();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete task" });
        }
    });

    app.get("/api/tasks/my", isAuthenticated, async (req, res) => {
        try {
            const user = req.user as any;
            const tasks = await storage.getTasksByAssignee(user.id);
            res.json(tasks);
        } catch (err) {
            console.error("[error] /api/tasks/my failed:", err);
            res.status(500).json({ message: "Server error" });
        }
    });
}
