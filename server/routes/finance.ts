import type { Express } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";
import path from "path";
import { generateInvoicePdfPuppeteer, getInvoicePdfPath } from "../invoicePdfPuppeteer";
import { generateContractPdfPuppeteer, getContractPdfPath } from "../contractPdfPuppeteer";
import { getUsdToUzsRate } from "../currencyRate";

export function registerFinanceRoutes(app: Express, isAuthenticated: any, isAdmin: any) {
    // --- Transactions ---
    app.get(api.transactions.list.path, isAuthenticated, async (req, res) => {
        const txs = await storage.getTransactions();
        res.json(txs);
    });

    app.post(api.transactions.create.path, isAuthenticated, async (req, res) => {
        try {
            const input = api.transactions.create.input.extend({
                projectId: z.coerce.number().optional(),
                amount: z.union([z.string(), z.number()]).transform(v => String(v)),
            }).parse(req.body);
            const tx = await storage.createTransaction(input);
            res.status(201).json(tx);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Failed to create transaction" });
        }
    });

    app.put(api.transactions.update.path, isAuthenticated, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid transaction ID" });
            const input = api.transactions.update.input.extend({
                projectId: z.coerce.number().optional().nullable(),
                amount: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
            }).parse(req.body);
            const tx = await storage.updateTransaction(id, input);
            if (!tx) return res.status(404).json({ message: "Transaction not found" });
            res.json(tx);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Failed to update transaction" });
        }
    });

    app.delete(api.transactions.delete.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid transaction ID" });
            }
            await storage.deleteTransaction(id);
            res.status(204).end();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete transaction" });
        }
    });

    // --- Invoices ---
    app.get(api.invoices.list.path, isAuthenticated, async (req, res) => {
        const invoices = await storage.getInvoices();
        res.json(invoices);
    });

    app.get("/api/invoices/next-number", isAuthenticated, async (req, res) => {
        try {
            const invoiceNumber = await storage.getNextInvoiceNumber();
            res.json({ invoiceNumber });
        } catch (err) {
            console.error("Next invoice number error:", err);
            res.status(500).json({ message: "Raqam generatsiya qilishda xato." });
        }
    });

    app.get("/api/invoices/verify/:invoiceNumber", isAuthenticated, async (req, res) => {
        try {
            const invoice = await storage.getInvoiceByNumber(req.params.invoiceNumber);
            if (!invoice) return res.json({ notFound: true });

            const subtotal = Number(invoice.amount) || 0;
            const vat = Number(invoice.vatRate) || 0;
            const disc = Number(invoice.discountRate) || 0;
            const paid = Number(invoice.paidAmount) || 0;
            const finalAmount = Math.max(0, subtotal + (subtotal * vat / 100) - (subtotal * disc / 100) - paid);

            res.json({
                invoice: {
                    clientName: invoice.clientName,
                    amount: finalAmount,
                    currency: invoice.currency
                }
            });
        } catch (err) {
            console.error("Verify invoice error:", err);
            res.status(500).json({ message: "Tekshirishda xato yuz berdi" });
        }
    });

    app.get("/api/public/verify-invoice/:token", async (req, res) => {
        try {
            const invoice = await storage.getInvoiceByToken(req.params.token);
            if (!invoice) return res.status(404).json({ message: "Hisob-faktura topilmadi yoki belgi noto'g'ri." });

            const subtotal = Number(invoice.amount) || 0;
            const vat = Number(invoice.vatRate) || 0;
            const disc = Number(invoice.discountRate) || 0;
            const paid = Number(invoice.paidAmount) || 0;
            const finalAmount = Math.max(0, subtotal + (subtotal * vat / 100) - (subtotal * disc / 100) - paid);

            res.json({
                invoice: {
                    invoiceNumber: invoice.invoiceNumber,
                    clientName: invoice.clientName,
                    amount: finalAmount,
                    currency: invoice.currency,
                    dueDate: invoice.dueDate,
                    status: invoice.status,
                    company: invoice.company,
                    createdAt: invoice.createdAt
                }
            });
        } catch (err) {
            console.error("Public verify invoice error:", err);
            res.status(500).json({ message: "Ichki server xatosi" });
        }
    });

    app.post(api.invoices.create.path, isAuthenticated, async (req, res) => {
        try {
            const input = api.invoices.create.input.extend({
                projectId: z.coerce.number(),
                invoiceNumber: z.string().optional(),
                amount: z.union([z.string(), z.number()]).transform(v => String(v)),
                dueDate: z.union([z.string(), z.date(), z.number()]).transform(v => new Date(v)),
                status: z.enum(["paid", "pending", "unpaid"]).optional(),
                contractPartner: z.string().optional(),
                contractStartDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                contractEndDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                language: z.enum(["uz", "en", "ru"]).optional().default("uz"),
                paidAmount: z.union([z.string(), z.number()]).optional().default("0").transform(v => String(v)),
                vatRate: z.union([z.string(), z.number()]).optional().default("0").transform(v => String(v)),
                discountRate: z.union([z.string(), z.number()]).optional().default("0").transform(v => String(v)),
            }).parse(req.body);
            const projectId = Number(input.projectId);
            if (!projectId || projectId < 1) {
                return res.status(400).json({ message: "Loyihani tanlang." });
            }
            const project = await storage.getProject(projectId);
            if (!project) {
                return res.status(400).json({ message: "Tanlangan loyiha topilmadi." });
            }
            const invoiceNumber = input.invoiceNumber || await storage.getNextInvoiceNumber();
            const invoice = await storage.createInvoice({
                ...input,
                invoiceNumber,
                dueDate: input.dueDate,
            });
            res.status(201).json(invoice);
        } catch (err) {
            if (err instanceof z.ZodError) {
                const msg = err.errors[0]?.message || "Ma'lumotlar noto'g'ri.";
                return res.status(400).json({ message: msg, field: err.errors[0]?.path?.join?.(".") });
            }
            console.error("Create invoice error:", err);
            res.status(500).json({ message: "Faktura yaratishda xato. Qayta urinib ko'ring." });
        }
    });

    app.put("/api/invoices/:id", isAuthenticated, async (req, res) => {
        try {
            const input = z.object({
                status: z.string().optional(),
                amount: z.string().optional(),
                clientName: z.string().optional(),
                company: z.string().optional(),
                billToContact: z.string().optional(),
                contractPartner: z.string().optional(),
                paymentTerms: z.string().optional(),
                projectId: z.coerce.number().optional(),
                dueDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                contractStartDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                contractEndDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                language: z.enum(["uz", "en", "ru"]).optional(),
                paidAmount: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
                vatRate: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
                discountRate: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? String(v) : undefined),
            }).parse(req.body);

            const updated = await storage.updateInvoice(Number(req.params.id), input);
            if (!updated) return res.status(404).json({ message: "Invoice not found" });
            res.json(updated);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message });
            }
            res.status(500).json({ message: "Failed to update invoice" });
        }
    });

    app.delete("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
        try {
            await storage.deleteInvoice(Number(req.params.id));
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete invoice" });
        }
    });

    app.get("/api/invoices/:id/items", isAuthenticated, async (req, res) => {
        try {
            const items = await storage.getInvoiceItems(Number(req.params.id));
            res.json(items);
        } catch (err) {
            res.status(500).json({ message: "Internal Error" });
        }
    });

    app.post("/api/invoices/:id/items", isAuthenticated, async (req, res) => {
        try {
            const body = z.object({
                title: z.string(),
                quantity: z.coerce.number().default(1),
                paidQuantity: z.coerce.number().default(1),
                unitPrice: z.union([z.string(), z.number()]).transform(v => String(v)),
                serviceType: z.enum(["row", "server", "api"]).optional(),
                startDate: z.union([z.string(), z.date()]).optional().transform(v => v ? new Date(v) : undefined),
                projectId: z.coerce.number().optional(),
            }).parse(req.body);
            const invId = Number(req.params.id);
            const item = await storage.createInvoiceItem({
                invoiceId: invId,
                title: body.title,
                quantity: body.quantity,
                paidQuantity: body.paidQuantity,
                unitPrice: body.unitPrice,
                serviceType: body.serviceType ?? "row",
                startDate: body.startDate ?? null,
                projectId: body.projectId ?? null,
            });
            const items = await storage.getInvoiceItems(invId);
            const total = items.reduce((s, i) => {
                const multiplier = Number(i.paidQuantity) || 1;
                return s + multiplier * Number(i.unitPrice);
            }, 0);
            await storage.updateInvoice(invId, { amount: String(Math.round(total)) });
            res.status(201).json(item);
        } catch (err) {
            if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
            res.status(500).json({ message: "Internal Error" });
        }
    });

    app.post("/api/invoices/:id/items/batch", isAuthenticated, async (req, res) => {
        try {
            const invId = Number(req.params.id);
            const { items: rawItems } = req.body;
            if (!Array.isArray(rawItems)) throw new Error("Items array required");

            const itemSchema = z.object({
                title: z.string(),
                quantity: z.coerce.number().default(1),
                paidQuantity: z.coerce.number().default(1),
                unitPrice: z.union([z.string(), z.number()]).transform(v => String(v)),
                serviceType: z.string().optional(),
                startDate: z.union([z.string(), z.date(), z.null()]).optional().transform(v => (v && v !== "null") ? new Date(v) : undefined),
                projectId: z.coerce.number().optional(),
            });

            // 1. Clear existing items
            const existing = await storage.getInvoiceItems(invId);
            for (const ex of existing) {
                await storage.deleteInvoiceItem(ex.id);
            }

            // 2. Create new items
            const createdItems = [];
            let total = 0;
            for (const rawItem of rawItems) {
                const body = itemSchema.parse(rawItem);
                let st = "row";
                if (body.serviceType) {
                    const s = body.serviceType.toLowerCase();
                    if (s === "server" || s === "api") st = s;
                } else if (body.title) {
                    const t = body.title.toLowerCase();
                    if (t.includes("server")) st = "server";
                    else if (t.includes("api")) st = "api";
                }

                const item = await storage.createInvoiceItem({
                    invoiceId: invId,
                    title: body.title,
                    quantity: body.quantity,
                    paidQuantity: body.paidQuantity,
                    unitPrice: body.unitPrice,
                    serviceType: st,
                    startDate: body.startDate ?? null,
                    projectId: body.projectId ?? null,
                });
                createdItems.push(item);

                const multiplier = Number(body.paidQuantity) || 1;
                total += multiplier * Number(body.unitPrice);
            }

            // 3. Update invoice total
            await storage.updateInvoice(invId, { amount: String(Math.round(total)) });
            res.status(201).json({ items: createdItems, total });
        } catch (err) {
            if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
            res.status(500).json({ message: "Batch creation failed" });
        }
    });

    app.delete("/api/invoices/:invoiceId/items/:itemId", isAuthenticated, async (req, res) => {
        try {
            const itemId = Number(req.params.itemId);
            const invoiceId = Number(req.params.invoiceId);
            await storage.deleteInvoiceItem(itemId);
            const remaining = await storage.getInvoiceItems(invoiceId);
            const total = remaining.reduce((s, i) => {
                const multiplier = Number(i.paidQuantity) || 1;
                return s + multiplier * Number(i.unitPrice);
            }, 0);
            await storage.updateInvoice(invoiceId, { amount: String(Math.round(total)) });
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete item" });
        }
    });

    const DEFAULT_PDF_WIDTH = 794;
    const DEFAULT_PDF_HEIGHT = 1123;
    app.post("/api/invoices/:id/generate-pdf", isAuthenticated, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const body = (req.body || {}) as { width?: number; height?: number };
            const widthPx = typeof body.width === "number" && body.width > 0 ? body.width : DEFAULT_PDF_WIDTH;
            const heightPx = typeof body.height === "number" && body.height > 0 ? body.height : DEFAULT_PDF_HEIGHT;

            const invoice = await storage.getInvoice(id);
            if (!invoice) return res.status(404).json({ message: "Invoice not found" });
            const items = await storage.getInvoiceItems(id);

            const project = invoice.projectId ? await storage.getProject(invoice.projectId) : undefined;
            const invoiceSettingsRow = await storage.getInvoiceSettings();

            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host") || "localhost:5000"}`;
            const url = await generateInvoicePdfPuppeteer(
                {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    status: invoice.status ?? undefined,
                    paidAmount: invoice.paidAmount,
                    vatRate: invoice.vatRate,
                    discountRate: invoice.discountRate,
                    verificationToken: invoice.verificationToken,
                    paymentTerms: invoice.paymentTerms ?? undefined,
                    clientName: invoice.clientName ?? undefined,
                    company: invoice.company ?? undefined,
                    billToContact: invoice.billToContact ?? undefined,
                    dueDate: invoice.dueDate,
                    createdAt: invoice.createdAt,
                    projectId: invoice.projectId,
                },
                items.map((i) => ({
                    title: i.title,
                    quantity: i.quantity,
                    paidQuantity: i.paidQuantity,
                    unitPrice: i.unitPrice,
                    serviceType: i.serviceType ?? undefined,
                    startDate: i.startDate ?? undefined,
                })),
                project ? { name: project.name } : undefined,
                invoiceSettingsRow,
                widthPx,
                heightPx,
                baseUrl,
                (invoice.language as "uz" | "en" | "ru") ?? "uz"
            );
            await storage.updateInvoice(id, { pdfUrl: url });
            res.json({ url });
        } catch (err) {
            console.error("PDF generation failed:", err);
            res.status(500).json({ message: "PDF yaratishda xato" });
        }
    });

    app.get("/api/invoices/:id/pdf", isAuthenticated, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const invoice = await storage.getInvoice(id);
            if (!invoice) return res.status(404).json({ message: "Invoice not found" });

            const filePath = getInvoicePdfPath(id);
            if (!filePath) return res.status(404).json({ message: "PDF topilmadi. Avval 'PDF yuklash' bosing." });

            const downloadName = `${invoice.invoiceNumber.replace(/\s/g, "-")}.pdf`;
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
            res.sendFile(path.resolve(filePath));
        } catch (err) {
            console.error("PDF serve failed:", err);
            res.status(500).json({ message: "PDF yuklanmadi" });
        }
    });

    const defaultPaymentDetailLines = [
        { title: "Bank nomi", value: "Your Bank Name" },
        { title: "Hisob raqami", value: "1234 5678 9012 3456" },
    ];
    function parsePaymentDetailLines(raw: string | null): { title: string; value: string }[] {
        if (!raw || !raw.trim()) return defaultPaymentDetailLines;
        try {
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr) || arr.length === 0) return defaultPaymentDetailLines;
            return arr.map((x: unknown) =>
                x && typeof x === "object" && "title" in x && "value" in x
                    ? { title: String((x as { title: unknown }).title), value: String((x as { value: unknown }).value) }
                    : { title: "", value: "" }
            ).filter((x: { title: string; value: string }) => x.title || x.value);
        } catch {
            return defaultPaymentDetailLines;
        }
    }

    app.get("/api/settings/invoice", isAuthenticated, async (_req, res) => {
        try {
            const row = await storage.getInvoiceSettings();
            const defaults = {
                companyName: "SAYD.X LLC",
                address: "Toshkent, O'zbekiston",
                phone: "+998 90 000 00 00",
                email: "info@saydx.uz",
                website: "saydx.uz",
                bankName: "Your Bank Name",
                accountNumber: "1234 5678 9012 3456",
                paymentDetailLines: defaultPaymentDetailLines,
                paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
                authorizedName: "Authorized Name",
                authorizedPosition: "Position",
            };
            if (!row) return res.json(defaults);
            const paymentDetailLines = parsePaymentDetailLines(row.paymentDetailLines);
            res.json({ ...row, paymentDetailLines });
        } catch (err) {
            res.status(500).json({ message: "Sozlamalarni o'qishda xato" });
        }
    });

    app.put("/api/settings/invoice", isAuthenticated, async (req, res) => {
        try {
            const body = req.body as unknown;
            const input = z.object({
                companyName: z.string().optional(),
                address: z.string().optional(),
                phone: z.string().optional(),
                email: z.string().optional(),
                website: z.string().optional(),
                bankName: z.string().optional(),
                accountNumber: z.string().optional(),
                paymentDetailLines: z.array(z.object({
                    title: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
                    value: z.union([z.string(), z.undefined()]).transform((v) => String(v ?? "")),
                })).optional(),
                paymentNote: z.string().optional(),
                authorizedName: z.string().optional(),
                authorizedPosition: z.string().optional(),
            }).parse(body);
            const updated = await storage.upsertInvoiceSettings(input);
            const paymentDetailLines = parsePaymentDetailLines(updated.paymentDetailLines);
            res.json({ ...updated, paymentDetailLines });
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0]?.message ?? "Noto'g'ri ma'lumot" });
            }
            res.status(500).json({ message: "Sozlamalarni saqlashda xato. Qayta urinib ko'ring." });
        }
    });

    // --- Contracts ---
    app.get(api.contracts.list.path, isAuthenticated, async (req, res) => {
        const list = await storage.getContracts();
        res.json(list);
    });

    app.post(api.contracts.create.path, isAuthenticated, async (req, res) => {
        try {
            const input = api.contracts.create.input.extend({
                clientId: z.preprocess(v => v === "" ? null : v, z.coerce.number().optional().nullable()),
                projectId: z.preprocess(v => v === "" ? null : v, z.coerce.number().optional().nullable()),
                amount: z.union([z.string(), z.number()]).transform(v => String(v)),
                startDate: z.union([z.string(), z.date(), z.number()]).transform(v => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) throw new Error("Yaroqsiz boshlanish sanasi");
                    return d;
                }),
                endDate: z.union([z.string(), z.date(), z.number()]).transform(v => {
                    const d = new Date(v);
                    if (isNaN(d.getTime())) throw new Error("Yaroqsiz tugash sanasi");
                    return d;
                }),
                technicalAssignmentUrl: z.preprocess(v => v === "" ? null : v, z.string().optional().nullable()),
                assignedEmployeeId: z.preprocess(v => v === "" ? null : v, z.string().optional().nullable()),
            }).parse(req.body);
            const contract = await storage.createContract(input);
            res.status(201).json(contract);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            console.error("Create contract error:", err);
            res.status(500).json({ message: err instanceof Error ? err.message : "Failed to create contract" });
        }
    });

    app.delete(api.contracts.delete.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid contract ID" });
            await storage.deleteContract(id);
            res.status(204).end();
        } catch (err) {
            res.status(500).json({ message: "Failed to delete contract" });
        }
    });

    app.put(api.contracts.update.path, isAuthenticated, isAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const input = api.contracts.create.input.extend({
                clientId: z.preprocess(v => v === "" ? null : v, z.coerce.number().optional().nullable()),
                projectId: z.preprocess(v => v === "" ? null : v, z.coerce.number().optional().nullable()),
                amount: z.union([z.string(), z.number()]).transform(v => String(v)),
                startDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                endDate: z.union([z.string(), z.date(), z.number()]).optional().transform(v => v ? new Date(v) : undefined),
                technicalAssignmentUrl: z.preprocess(v => v === "" ? null : v, z.string().optional().nullable()),
                assignedEmployeeId: z.preprocess(v => v === "" ? null : v, z.string().optional().nullable()),
            }).partial().parse(req.body);
            
            const contract = await storage.updateContract(id, input);
            if (!contract) return res.status(404).json({ message: "Contract not found" });
            res.json(contract);
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            console.error("Update contract error:", err);
            res.status(500).json({ message: "Failed to update contract" });
        }
    });

    app.post("/api/contracts/:id/generate-pdf", isAuthenticated, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const contract = await storage.getContract(id);
            if (!contract) return res.status(404).json({ message: "Contract not found" });

            const settings = await storage.getInvoiceSettings();
            const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host") || "localhost:5000"}`;

            const url = await generateContractPdfPuppeteer(contract, settings, baseUrl);
            await storage.updateContract(id, { pdfUrl: url });
            res.json({ url });
        } catch (err) {
            console.error("Contract PDF generation failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            res.status(500).json({ message: `Shartnoma PDF yaratishda xato: ${msg}` });
        }
    });

    app.get("/api/contracts/:id/pdf", isAuthenticated, async (req, res) => {
        try {
            const id = Number(req.params.id);
            const contract = await storage.getContract(id);
            if (!contract) return res.status(404).json({ message: "Contract not found" });

            const filePath = getContractPdfPath(id);
            if (!filePath) return res.status(404).json({ message: "PDF topilmadi" });

            const safeNumber = contract.contractNumber.replace(/[^a-zA-Z0-9-]/g, "_");
            const downloadName = `SHARTNOMA-${safeNumber}.pdf`;
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
            res.sendFile(path.resolve(filePath));
        } catch (err) {
            console.error("PDF download failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            res.status(500).json({ message: `PDF yuklanmadi: ${msg}` });
        }
    });
    // --- Contracts ---
    app.get("/api/contracts/next-number", isAuthenticated, async (req, res) => {
        try {
            const contractNumber = await storage.getNextContractNumber();
            res.json({ contractNumber });
        } catch (err) {
            console.error("Next contract number error:", err);
            res.status(500).json({ message: "Raqam generatsiya qilishda xato." });
        }
    });

    app.get("/api/contracts/verify/:contractNumber", isAuthenticated, async (req, res) => {
        try {
            const contract = await storage.getContractByNumber(req.params.contractNumber);
            if (!contract) return res.json({ notFound: true });
            res.json({
                contract: {
                    contractNumber: contract.contractNumber,
                    clientName: contract.clientName,
                    amount: contract.amount,
                    currency: contract.currency,
                    status: contract.status,
                    createdAt: contract.createdAt
                }
            });
        } catch (err) {
            console.error("Verify contract error:", err);
            res.status(500).json({ message: "Tekshirishda xato yuz berdi" });
        }
    });

    app.get("/api/public/verify-contract/:token", async (req, res) => {
        try {
            const contract = await storage.getContractByToken(req.params.token);
            if (!contract) return res.status(404).json({ message: "Shartnoma topilmadi yoki belgi noto'g'ri." });

            res.json({
                contract: {
                    contractNumber: contract.contractNumber,
                    clientName: contract.clientName,
                    amount: contract.amount,
                    currency: contract.currency,
                    startDate: contract.startDate,
                    endDate: contract.endDate,
                    status: contract.status,
                    createdAt: contract.createdAt
                }
            });
        } catch (err) {
            console.error("Public verify contract error:", err);
            res.status(500).json({ message: "Ichki server xatosi" });
        }
    });
    app.get("/api/currency-rate", isAuthenticated, async (req, res) => {
        try {
            const settings = await storage.getFinanceSettings();
            const result = await getUsdToUzsRate(() => Promise.resolve(settings));
            res.json({ 
                usdToUzs: result.rate, 
                currencyRateSource: result.source,
                useAutomaticRate: settings.useAutomaticRate
            });
        } catch (err) {
            console.error("Currency rate error:", err);
            res.status(500).json({ usdToUzs: 12500, currencyRateSource: "fallback" });
        }
    });

    app.put("/api/settings/finance", isAuthenticated, isAdmin, async (req, res) => {
        try {
            const input = z.object({
                manualUsdToUzs: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
                useAutomaticRate: z.boolean().optional(),
            }).parse(req.body);
            await storage.updateFinanceSettings(input);
            res.json({ success: true });
        } catch (err) {
            if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
            res.status(500).json({ message: "Internal Error" });
        }
    });
}
