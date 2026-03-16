import { sql, relations } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, foreignKey, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Auth tables (inlined to avoid Vercel MODULE_NOT_FOUND on shared/models/auth) ---
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("admin"),
  companyRole: varchar("company_role"), // ex: Backend dasturchi, Frontend dasturchi
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;

// --- Chat tables (inlined to avoid Vercel MODULE_NOT_FOUND on shared/models/chat) ---
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// --- Application Tables ---

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  score: integer("score").default(100),
  isBlacklisted: boolean("is_blacklisted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  responsibleTelegram: text("responsible_telegram"),
  additionalInfo: text("additional_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"), // ish nimalar qilish kerakligi
  clientId: integer("client_id").references(() => clients.id),
  companyId: integer("company_id").references(() => companies.id),
  type: text("type").notNull(), // web, bot, dizayn, server, marketing
  budget: numeric("budget").notNull(),
  currency: text("currency").notNull().default("UZS"), // UZS, USD
  startDate: timestamp("start_date").notNull(),
  deadlineDate: timestamp("deadline_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed, delayed
  progress: integer("progress").default(0).notNull(), // 0-100%
  paymentProgress: integer("payment_progress").default(0).notNull(), // 0-100%
  riskLevel: text("risk_level").default("LOW"), // LOW, MEDIUM, HIGH
  priority: text("priority").default("medium").notNull(), // high, medium, low — ustunlik
  additionalRequirements: text("additional_requirements"), // qo'shimcha nimalar kerakligi
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    parentTaskId: integer("parent_task_id"),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").default("medium").notNull(), // low, medium, high
    status: text("status").default("todo").notNull(), // todo, in progress, done
    loggedMinutes: integer("logged_minutes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inProgressStartedAt: timestamp("in_progress_started_at"),
    completedAt: timestamp("completed_at"),
    dueDate: timestamp("due_date"),
    reopenComment: text("reopen_comment"),
    assigneeId: varchar("assignee_id").references(() => users.id), // Added for Multi-Role
  },
  (table) => ({
    parentTaskFk: foreignKey({
      columns: [table.parentTaskId],
      foreignColumns: [table.id],
      name: "tasks_parent_task_id_fkey",
    }).onDelete("cascade"),
  })
);

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  durationMinutes: integer("duration_minutes").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  description: text("description"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: text("type").notNull(), // income, expense
  amount: numeric("amount").notNull(),
  currency: text("currency").default("UZS").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("UZS").notNull(), // USD | UZS — aniq
  status: text("status").default("pending").notNull(), // paid | pending | unpaid — To'langan | Kutilmoqda | To'lanmadi
  dueDate: timestamp("due_date").notNull(),
  pdfUrl: text("pdf_url"),
  paidAmount: numeric("paid_amount").default("0").notNull(),
  verificationToken: text("verification_token").unique().notNull(),
  paymentTerms: text("payment_terms"),
  clientName: text("client_name"),
  company: text("company"),
  billToContact: text("bill_to_contact"),
  /** Shartnoma: kim bn (qaysi mijoz/kompaniya) */
  contractPartner: text("contract_partner"),
  /** Shartnoma: boshlanish sanasi (qachon) */
  contractStartDate: timestamp("contract_start_date"),
  /** Shartnoma: tugash sanasi (qanchaga) */
  contractEndDate: timestamp("contract_end_date"),
  /** PDF til: uz | en | ru */
  language: text("language").default("uz"),
  vatRate: numeric("vat_rate").default("0").notNull(),
  discountRate: numeric("discount_rate").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  /** To'lov uchun nechtasi hisoblanishi (paid units) */
  paidQuantity: integer("paid_quantity").default(1).notNull(),
  unitPrice: numeric("unit_price").notNull(),
  /** row | server | api — 3 xil xizmat, PDFda 3 xil jadval */
  serviceType: text("service_type").default("row"),
  /** Server/API: boshlanish sanasi, quantity = necha oy, qolgan oy hisoblanadi */
  startDate: timestamp("start_date"),
  /** Server/API: qaysi loyiha uchun (projectId) */
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** PDF faktura uchun sozlamalar (FROM, to'lov, imzo) — bitta qator. */
export const invoiceSettings = pgTable("invoice_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").default("SAYD.X LLC"),
  address: text("address").default("Toshkent, O'zbekiston"),
  phone: text("phone").default("+998 90 000 00 00"),
  email: text("email").default("info@saydx.uz"),
  website: text("website").default("saydx.uz"),
  bankName: text("bank_name").default("Your Bank Name"),
  accountNumber: text("account_number").default("1234 5678 9012 3456"),
  /** To'lov bo'yicha qo'shimcha qatorlar: sarlavha + qiymat (masalan Karta egasi, Karta raqami). JSON: [{title, value}, ...] */
  paymentDetailLines: text("payment_detail_lines"),
  paymentNote: text("payment_note").default("To'lov shartnoma asosida amalga oshiriladi."),
  authorizedName: text("authorized_name").default("Authorized Name"),
  authorizedPosition: text("authorized_position").default("Position"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Moliya: qo'lda USD→UZS kursi (API ishlamasa ishlatiladi). Bitta qator. */
export const financeSettings = pgTable("finance_settings", {
  id: serial("id").primaryKey(),
  manualUsdToUzs: numeric("manual_usd_to_uzs").default("12500"), // 1 USD = ? UZS
  useAutomaticRate: boolean("use_automatic_rate").default(true).notNull(),
});

/** Xodimlar uchun OYLIK (Salaries) jadvali */
export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Umumiy oylik (Total monthly salary) */
  totalSalary: numeric("total_salary").notNull(),
  /** Avans (Advance payment) */
  advance: numeric("advance").default("0").notNull(),
  /** Bu oydan qolgan summa (Bu oydan qolgan summa) - Auto calculated client side, stored for history */
  remainingAmount: numeric("remaining_amount").notNull(),
  /** Loyihadan berilgan summa (Bonus from projects) */
  projectBonus: numeric("project_bonus").default("0").notNull(),
  /** Jarima (Fines) */
  fine: numeric("fine").default("0").notNull(),
  /** Bir oyda xodimage berilgan jami summa (Total paid per month) */
  totalPaid: numeric("total_paid").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNumber: text("contract_number").notNull(),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("UZS").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").default("active").notNull(), // active, completed, cancelled
  description: text("description"),
  
  // New fields from sketch
  workMethod: text("work_method").default("offline"), // online, offline
  advancePayment: numeric("advance_payment").default("0"),
  remainingAmount: numeric("remaining_amount").default("0"),
  contractType: text("contract_type"), // Turi
  technicalAssignmentUrl: text("technical_assignment_url"), // TZ fayl manzili
  assignedEmployeeId: varchar("assigned_employee_id").references(() => users.id),
  paymentType: text("payment_type"), // To'lov turi
  pdfUrl: text("pdf_url"),
  verificationToken: text("verification_token"),
  title: text("title"),
  
  // Client specific details for the contract document
  clientAddress: text("client_address"),
  clientPhone: text("client_phone"),
  clientBankName: text("client_bank_name"),
  clientMfo: text("client_mfo"),
  clientInn: text("client_inn"),
  clientAccountNumber: text("client_account_number"),
  
  // Offer specific fields
  workSchedule: text("work_schedule"),
  managerPhone: text("manager_phone"),
  clickDetails: text("click_details"),
  issueContact: text("issue_contact"),
  projectDurationInfo: text("project_duration_info"),
  proposedServices: text("proposed_services"),
  advantages: text("advantages"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Relations ---

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  tasks: many(tasks),
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  items: many(invoiceItems),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: "subtasks" }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  timeEntries: many(timeEntries),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const salariesRelations = relations(salaries, ({ one }) => ({
  user: one(users, { fields: [salaries.userId], references: [users.id] }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  project: one(projects, { fields: [contracts.projectId], references: [projects.id] }),
  assignedEmployee: one(users, { fields: [contracts.assignedEmployeeId], references: [users.id] }),
}));

// --- Zod Schemas ---

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects)
  .omit({ id: true, createdAt: true, riskLevel: true })
  .extend({
    startDate: z.coerce.date(),
    deadlineDate: z.coerce.date(),
  });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, loggedMinutes: true });
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, date: true });
export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true })
  .extend({ date: z.coerce.date().optional() });
export const insertInvoiceSchema = createInsertSchema(invoices, {
  dueDate: z.coerce.date(),
  amount: z.string(),
  paidAmount: z.string(),
  verificationToken: z.string().optional(),
  vatRate: z.string().optional(),
  discountRate: z.string().optional(),
}).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true, createdAt: true });
export const insertSalarySchema = createInsertSchema(salaries).omit({ id: true, createdAt: true });
export const insertContractSchema = createInsertSchema(contracts, {
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).omit({ id: true, createdAt: true }).extend({
  projectId: z.coerce.number().optional().nullable(),
  assignedEmployeeId: z.string().optional().nullable(),
  clientId: z.coerce.number().optional().nullable(),
  workSchedule: z.string().optional().nullable(),
  managerPhone: z.string().optional().nullable(),
  clickDetails: z.string().optional().nullable(),
  issueContact: z.string().optional().nullable(),
  projectDurationInfo: z.string().optional().nullable(),
  proposedServices: z.string().optional().nullable(),
  advantages: z.string().optional().nullable(),
});

export const paymentDetailLineSchema = z.object({ title: z.string(), value: z.string() });
export const updateInvoiceSettingsSchema = z.object({
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  paymentDetailLines: z.array(paymentDetailLineSchema).optional(),
  paymentNote: z.string().optional(),
  authorizedName: z.string().optional(),
  authorizedPosition: z.string().optional(),
});

// --- Types ---

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProjectRequest = Partial<InsertProject>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTaskRequest = Partial<InsertTask>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export type InvoiceSettings = typeof invoiceSettings.$inferSelect;
export type UpdateInvoiceSettings = z.infer<typeof updateInvoiceSettingsSchema>;

export type Salary = typeof salaries.$inferSelect;
export type InsertSalary = z.infer<typeof insertSalarySchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
