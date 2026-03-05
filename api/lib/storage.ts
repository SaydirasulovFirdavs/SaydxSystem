import { db } from "./db.js";
import { eq, desc, sql, and, gte, lte, like } from "drizzle-orm";
import {
  clients, companies, projects, tasks, timeEntries, transactions, invoices, invoiceItems, invoiceSettings, financeSettings, users,
  type Client, type InsertClient,
  type Company, type InsertCompany,
  type Project, type InsertProject, type UpdateProjectRequest,
  type Task, type InsertTask, type UpdateTaskRequest,
  type TimeEntry, type InsertTimeEntry,
  type Transaction, type InsertTransaction,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type InvoiceSettings, type UpdateInvoiceSettings,
} from "../../shared/schema.js";

export interface IStorage {
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: UpdateTaskRequest): Promise<Task>;
  getFirstUserId(): Promise<string | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  getTotalLoggedMinutes(): Promise<number>;
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: { status?: string; amount?: string; pdfUrl?: string }): Promise<Invoice | undefined>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;
  getInvoiceSettings(): Promise<InvoiceSettings | null>;
  upsertInvoiceSettings(data: UpdateInvoiceSettings): Promise<InvoiceSettings>;
  getManualUsdToUzs(): Promise<number | null>;
  setManualUsdToUzs(rate: number): Promise<void>;
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  getTimeEntriesBetween(start: Date, end: Date): Promise<TimeEntry[]>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const rows = await db.insert(clients).values(client).returning();
    const newClient = rows[0];
    if (!newClient) throw new Error("Failed to create client");
    return newClient;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const rows = await db.insert(companies).values(company).returning();
    const newCompany = rows[0];
    if (!newCompany) throw new Error("Failed to create company");
    return newCompany;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const rows = await db.insert(projects).values(project).returning();
    const newProject = rows[0];
    if (!newProject) throw new Error("Failed to create project");
    return newProject;
  }

  async updateProject(id: number, updates: UpdateProjectRequest): Promise<Project> {
    const rows = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    const updated = rows[0];
    if (!updated) throw new Error("Project not found");
    return updated;
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
  }

  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId)).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
    return row;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const rows = await db.insert(tasks).values(task).returning();
    const newTask = rows[0];
    if (!newTask) throw new Error("Failed to create task");
    return newTask;
  }

  async updateTask(id: number, updates: UpdateTaskRequest): Promise<Task> {
    const rows = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    const updated = rows[0];
    if (!updated) throw new Error("Task not found");
    return updated;
  }

  async getFirstUserId(): Promise<string | undefined> {
    const [u] = await db.select({ id: users.id }).from(users).limit(1);
    return u?.id;
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const rows = await db.insert(timeEntries).values(entry).returning();
    const newEntry = rows[0];
    if (!newEntry) throw new Error("Failed to create time entry");
    const [task] = await db.select().from(tasks).where(eq(tasks.id, entry.taskId)).limit(1);
    if (task) {
      await db.update(tasks).set({ loggedMinutes: task.loggedMinutes + entry.durationMinutes }).where(eq(tasks.id, entry.taskId));
    }
    return newEntry;
  }

  async getTotalLoggedMinutes(): Promise<number> {
    const r = await db.select({ total: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)` }).from(timeEntries);
    return Number(r[0]?.total ?? 0);
  }

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const rows = await db.insert(transactions).values(transaction).returning();
    const newTx = rows[0];
    if (!newTx) throw new Error("Failed to create transaction");
    return newTx;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
    return row;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `INV-${y}${m}${d}-`;
    const rows = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(like(invoices.invoiceNumber, `${prefix}%`));
    let maxN = 0;
    for (const r of rows) {
      const num = r.invoiceNumber ? parseInt(r.invoiceNumber.slice(prefix.length), 10) : 0;
      if (!Number.isNaN(num) && num > maxN) maxN = num;
    }
    const next = maxN + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const rows = await db.insert(invoices).values(invoice).returning();
    const newInvoice = rows[0];
    if (!newInvoice) throw new Error("Failed to create invoice");
    return newInvoice;
  }

  async updateInvoice(id: number, updates: { status?: string; amount?: string; pdfUrl?: string }): Promise<Invoice | undefined> {
    const rows = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return rows[0];
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(invoiceItems.id);
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const rows = await db.insert(invoiceItems).values(item).returning();
    const row = rows[0];
    if (!row) throw new Error("Failed to create invoice item");
    return row;
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  async getInvoiceSettings(): Promise<InvoiceSettings | null> {
    const [row] = await db.select().from(invoiceSettings).limit(1);
    return row ?? null;
  }

  async upsertInvoiceSettings(data: UpdateInvoiceSettings): Promise<InvoiceSettings> {
    const [existing] = await db.select().from(invoiceSettings).limit(1);
    const paymentDetailLinesJson =
      data.paymentDetailLines !== undefined
        ? JSON.stringify(data.paymentDetailLines)
        : (existing?.paymentDetailLines ?? null);
    const payload = {
      companyName: data.companyName ?? existing?.companyName ?? "SAYD.X LLC",
      address: data.address ?? existing?.address ?? "Toshkent, O'zbekiston",
      phone: data.phone ?? existing?.phone ?? "+998 90 000 00 00",
      email: data.email ?? existing?.email ?? "info@saydx.uz",
      website: data.website ?? existing?.website ?? "saydx.uz",
      bankName: data.bankName ?? existing?.bankName ?? "Your Bank Name",
      accountNumber: data.accountNumber ?? existing?.accountNumber ?? "1234 5678 9012 3456",
      paymentDetailLines: paymentDetailLinesJson,
      paymentNote: data.paymentNote ?? existing?.paymentNote ?? "To'lov shartnoma asosida amalga oshiriladi.",
      authorizedName: data.authorizedName ?? existing?.authorizedName ?? "Authorized Name",
      authorizedPosition: data.authorizedPosition ?? existing?.authorizedPosition ?? "Position",
      updatedAt: new Date(),
    };
    if (existing) {
      const rows = await db.update(invoiceSettings).set(payload).where(eq(invoiceSettings.id, existing.id)).returning();
      const updated = rows[0];
      if (!updated) throw new Error("Failed to update invoice settings");
      return updated;
    }
    const insertRows = await db.insert(invoiceSettings).values({
      companyName: data.companyName ?? "SAYD.X LLC",
      address: data.address ?? "Toshkent, O'zbekiston",
      phone: data.phone ?? "+998 90 000 00 00",
      email: data.email ?? "info@saydx.uz",
      website: data.website ?? "saydx.uz",
      bankName: data.bankName ?? "Your Bank Name",
      accountNumber: data.accountNumber ?? "1234 5678 9012 3456",
      paymentDetailLines: paymentDetailLinesJson,
      paymentNote: data.paymentNote ?? "To'lov shartnoma asosida amalga oshiriladi.",
      authorizedName: data.authorizedName ?? "Authorized Name",
      authorizedPosition: data.authorizedPosition ?? "Position",
    }).returning();
    const inserted = insertRows[0];
    if (!inserted) throw new Error("Failed to insert invoice settings");
    return inserted;
  }

  async getManualUsdToUzs(): Promise<number | null> {
    const [row] = await db.select().from(financeSettings).limit(1);
    if (!row?.manualUsdToUzs) return null;
    const n = Number(row.manualUsdToUzs);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async setManualUsdToUzs(rate: number): Promise<void> {
    const [existing] = await db.select().from(financeSettings).limit(1);
    const value = String(Math.round(rate));
    if (existing) {
      await db.update(financeSettings).set({ manualUsdToUzs: value }).where(eq(financeSettings.id, existing.id));
    } else {
      await db.insert(financeSettings).values({ manualUsdToUzs: value });
    }
  }

  async getTimeEntriesBetween(start: Date, end: Date): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(and(gte(timeEntries.date, start), lte(timeEntries.date, end))).orderBy(desc(timeEntries.date));
  }
}

export const storage = new DatabaseStorage();
