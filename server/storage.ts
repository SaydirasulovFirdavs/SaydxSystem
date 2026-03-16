import { db } from "./db";
import { eq, desc, sql, and, gte, lte, like } from "drizzle-orm";
import { randomBytes } from "crypto";
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
  salaries, type Salary, type InsertSalary,
  contracts, type Contract, type InsertContract,
} from "@shared/schema";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;

  // Companies
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsForEmployee(employeeId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: UpdateProjectRequest): Promise<Project>;

  // Tasks
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: UpdateTaskRequest): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Time Entries
  getFirstUserId(): Promise<string | undefined>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  getTotalLoggedMinutes(): Promise<number>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<void>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoiceByToken(token: string): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: { status?: string; amount?: string }): Promise<Invoice | undefined>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;
  getInvoiceSettings(): Promise<InvoiceSettings | null>;
  upsertInvoiceSettings(data: UpdateInvoiceSettings): Promise<InvoiceSettings>;
  getManualUsdToUzs(): Promise<number | null>;
  setManualUsdToUzs(rate: number): Promise<void>;
  getFinanceSettings(): Promise<{ manualUsdToUzs: number | null; useAutomaticRate: boolean }>;
  updateFinanceSettings(updates: { manualUsdToUzs?: number; useAutomaticRate?: boolean }): Promise<void>;
  // Salaries
  getSalaries(month?: number, year?: number, userId?: string): Promise<Salary[]>;
  createSalary(salary: InsertSalary): Promise<Salary>;
  updateSalary(id: number, updates: Partial<InsertSalary>): Promise<Salary | undefined>;
  deleteSalary(id: number): Promise<void>;
  // Time stats
  getTimeEntriesBetween(start: Date, end: Date): Promise<TimeEntry[]>;
  // Contracts
  getContracts(): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  deleteContract(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Clients
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

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsForEmployee(employeeId: string): Promise<Project[]> {
    const rows = await db
      .selectDistinct({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        clientId: projects.clientId,
        companyId: projects.companyId,
        type: projects.type,
        budget: projects.budget,
        currency: projects.currency,
        startDate: projects.startDate,
        deadlineDate: projects.deadlineDate,
        status: projects.status,
        progress: projects.progress,
        paymentProgress: projects.paymentProgress,
        riskLevel: projects.riskLevel,
        priority: projects.priority,
        additionalRequirements: projects.additionalRequirements,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(tasks, eq(tasks.projectId, projects.id))
      .where(eq(tasks.assigneeId, employeeId))
      .orderBy(desc(projects.createdAt));
    return rows as Project[];
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

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Tasks
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

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Time Entries
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

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const rows = await db.insert(transactions).values(transaction).returning();
    const newTx = rows[0];
    if (!newTx) throw new Error("Failed to create transaction");
    return newTx;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [row] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return row;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
    return row;
  }

  /** Generates next unique invoice number: INV-YYYYMMDD-NNNN (e.g. INV-20260225-0003). */
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
    const token = randomBytes(16).toString("hex");
    const rows = await db.insert(invoices).values({ ...(invoice as any), verificationToken: token } as any).returning();
    const newInvoice = rows[0];
    if (!newInvoice) throw new Error("Failed to create invoice");
    return newInvoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice> & { status?: string; pdfUrl?: string }): Promise<Invoice | undefined> {
    const rows = await db.update(invoices).set(updates as any).where(eq(invoices.id, id)).returning();
    return rows[0];
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice;
  }

  async getInvoiceByToken(token: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.verificationToken, token));
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
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
    const settings = await this.getFinanceSettings();
    return settings.manualUsdToUzs;
  }

  async setManualUsdToUzs(rate: number): Promise<void> {
    await this.updateFinanceSettings({ manualUsdToUzs: rate });
  }

  async getFinanceSettings(): Promise<{ manualUsdToUzs: number | null; useAutomaticRate: boolean }> {
    const [row] = await db.select().from(financeSettings).limit(1);
    if (!row) return { manualUsdToUzs: null, useAutomaticRate: true };
    const n = row.manualUsdToUzs ? Number(row.manualUsdToUzs) : null;
    return {
      manualUsdToUzs: (n !== null && Number.isFinite(n) && n > 0) ? n : null,
      useAutomaticRate: row.useAutomaticRate ?? true,
    };
  }

  async updateFinanceSettings(updates: { manualUsdToUzs?: number; useAutomaticRate?: boolean }): Promise<void> {
    const [existing] = await db.select().from(financeSettings).limit(1);
    
    const payload: any = {};
    if (updates.manualUsdToUzs !== undefined) payload.manualUsdToUzs = String(Math.round(updates.manualUsdToUzs));
    if (updates.useAutomaticRate !== undefined) payload.useAutomaticRate = updates.useAutomaticRate;

    if (existing) {
      await db.update(financeSettings).set(payload).where(eq(financeSettings.id, existing.id));
    } else {
      await db.insert(financeSettings).values(payload);
    }
  }

  async getTimeEntriesBetween(start: Date, end: Date): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(and(gte(timeEntries.date, start), lte(timeEntries.date, end))).orderBy(desc(timeEntries.date));
  }

  // Salaries
  async getSalaries(month?: number, year?: number, userId?: string): Promise<Salary[]> {
    let query = db.select().from(salaries);
    const conditions = [];
    if (month) conditions.push(eq(salaries.month, month));
    if (year) conditions.push(eq(salaries.year, year));
    if (userId) conditions.push(eq(salaries.userId, userId));

    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(salaries.createdAt))
      : await query.orderBy(desc(salaries.createdAt));

    return results;
  }

  async createSalary(salary: InsertSalary): Promise<Salary> {
    const [row] = await db.insert(salaries).values(salary).returning();
    if (!row) throw new Error("Database insert returned no rows");
    return row;
  }

  async updateSalary(id: number, updates: Partial<InsertSalary>): Promise<Salary | undefined> {
    const [row] = await db.update(salaries).set(updates).where(eq(salaries.id, id)).returning();
    return row;
  }

  async deleteSalary(id: number): Promise<void> {
    await db.delete(salaries).where(eq(salaries.id, id));
  }

  // Contracts
  async getNextContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SH-${year}/`;
    const rows = await db
      .select({ contractNumber: contracts.contractNumber })
      .from(contracts)
      .where(like(contracts.contractNumber, `${prefix}%`));
    let maxN = 0;
    for (const r of rows) {
      if (r.contractNumber) {
        const parts = r.contractNumber.split('/');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!Number.isNaN(num) && num > maxN) maxN = num;
        }
      }
    }
    const next = maxN + 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number): Promise<any> {
    const [row] = await db
      .select({
        contract: contracts,
        client: clients,
        project: projects,
      })
      .from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .leftJoin(projects, eq(contracts.projectId, projects.id))
      .where(eq(contracts.id, id));
    
    if (!row) return undefined;
    
    return {
      ...row.contract,
      clientName: row.client?.name,
      company: row.client?.company,
      clientEmail: row.client?.email,
      projectName: row.project?.name,
    };
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const token = randomBytes(16).toString("hex");
    const contractNumber = contract.contractNumber || await this.getNextContractNumber();
    const [row] = await db.insert(contracts).values({ 
      ...(contract as any), 
      contractNumber,
      verificationToken: token 
    } as any).returning();
    if (!row) throw new Error("Failed to create contract");
    return row;
  }

  async getContractByNumber(contractNumber: string): Promise<any> {
    const [row] = await db
      .select({
        contract: contracts,
        client: clients,
      })
      .from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(eq(contracts.contractNumber, contractNumber));
    
    if (!row) return undefined;
    
    return {
      ...row.contract,
      clientName: row.client?.name,
      company: row.client?.company,
    };
  }

  async getContractByToken(token: string): Promise<any> {
    const [row] = await db
      .select({
        contract: contracts,
        client: clients,
      })
      .from(contracts)
      .leftJoin(clients, eq(contracts.clientId, clients.id))
      .where(eq(contracts.verificationToken, token));
    
    if (!row) return undefined;
    
    return {
      ...row.contract,
      clientName: row.client?.name,
      company: row.client?.company,
    };
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | undefined> {
    const [row] = await db.update(contracts).set(updates as any).where(eq(contracts.id, id)).returning();
    return row;
  }

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }
}

export const storage = new DatabaseStorage();
