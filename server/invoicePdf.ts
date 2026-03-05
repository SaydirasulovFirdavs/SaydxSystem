import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "invoices");
const PUBLIC_LOGO_PATH = path.join(__dirname, "..", "client", "public", "LOGO2.png");
const LEGACY_LOGO_PATH = path.join(__dirname, "assets", "saydx-logo.png");
const IMZO_PATH = path.join(__dirname, "..", "client", "public", "imzo.PNG");
const IMZO_PATH_LOWER = path.join(__dirname, "..", "client", "public", "imzo.png");
const SIGNATURE_IMAGE_HEIGHT = 46;
const A4_WIDTH = 595; // ≈ 210mm
const LOGO_WIDTH = 120;
// 20mm ≈ 56.7pt
const PAGE_MARGIN = 57;
const HEADER_TITLE_MARGIN_TOP = 16;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export type InvoiceForPdf = {
  id: number;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status?: string | null;
  paymentTerms?: string | null;
  clientName?: string | null;
  company?: string | null;
  billToContact?: string | null;
  dueDate: Date;
  createdAt: Date;
  projectId: number;
};

export type InvoiceItemForPdf = {
  title: string;
  quantity: number;
  unitPrice: string;
  serviceType?: string | null;
  startDate?: Date | string | null;
};

export type ProjectForPdf = { name: string } | undefined;

export type InvoiceSettingsForPdf = {
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  /** JSON string: [{title, value}, ...] — to'lov qatorlari (sarlavha + qiymat) */
  paymentDetailLines?: string | null;
  paymentNote?: string | null;
  authorizedName?: string | null;
  authorizedPosition?: string | null;
} | null;

const defaultSettings: Required<Omit<InvoiceSettingsForPdf, null>> = {
  companyName: "SAYD.X LLC",
  address: "Toshkent, O'zbekiston",
  phone: "+998 90 000 00 00",
  email: "info@saydx.uz",
  website: "saydx.uz",
  bankName: "Your Bank Name",
  accountNumber: "1234 5678 9012 3456",
  paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
  authorizedName: "Authorized Name",
  authorizedPosition: "Position",
};

function getSettings(s: InvoiceSettingsForPdf) {
  if (!s) return defaultSettings;
  return {
    companyName: s.companyName ?? defaultSettings.companyName,
    address: s.address ?? defaultSettings.address,
    phone: s.phone ?? defaultSettings.phone,
    email: s.email ?? defaultSettings.email,
    website: s.website ?? defaultSettings.website,
    bankName: s.bankName ?? defaultSettings.bankName,
    accountNumber: s.accountNumber ?? defaultSettings.accountNumber,
    paymentNote: s.paymentNote ?? defaultSettings.paymentNote,
    authorizedName: s.authorizedName ?? defaultSettings.authorizedName,
    authorizedPosition: s.authorizedPosition ?? defaultSettings.authorizedPosition,
  };
}

/** Generates PDF and saves to uploads/invoices/{id}.pdf. Returns relative URL path. */
export async function generateInvoicePdf(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf = null
): Promise<string> {
  const s = getSettings(settings);
  ensureDir(UPLOAD_DIR);
  const filename = `chek-${invoice.invoiceNumber.replace(/\s/g, "-")}-${invoice.id}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const logoPath = fs.existsSync(PUBLIC_LOGO_PATH)
      ? PUBLIC_LOGO_PATH
      : fs.existsSync(LEGACY_LOGO_PATH)
        ? LEGACY_LOGO_PATH
        : null;

    // 1) HEADER: logo kichikroq, sarlavha aniq ajratilgan (ustma-ust tushmasin)
    if (logoPath) {
      const logoX = (A4_WIDTH - LOGO_WIDTH) / 2;
      doc.image(logoPath, logoX, PAGE_MARGIN, { width: LOGO_WIDTH });
      doc.y = PAGE_MARGIN + LOGO_WIDTH + HEADER_TITLE_MARGIN_TOP;
    } else {
      doc.moveDown(1);
    }
    doc.fontSize(18).font("Helvetica-Bold").text("HISOB-FAKTURA", {
      align: "center",
      characterSpacing: 1,
    });
    doc.moveDown(0.8);

    // 2) INVOICE INFO — saytdagi ko'rinish kabi (Hisob-faktura ma'lumotlari / Holat va valyuta)
    const issueDate = new Date(invoice.createdAt);
    const dueDate = new Date(invoice.dueDate);
    const validationId = `INV-${invoice.id.toString().padStart(6, "0")}`;
    const dateStr = (d: Date) => d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
    const leftX = PAGE_MARGIN;
    const rightX = A4_WIDTH / 2 + 10;
    let cursorY = doc.y + 10;

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
    doc.text("Hisob-faktura ma'lumotlari", leftX, cursorY);
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text(`Raqam: ${invoice.invoiceNumber}`, leftX, cursorY + 14);
    doc.text(`ID: ${validationId}`, leftX, cursorY + 28);
    doc.text(`Sana: ${dateStr(issueDate)}`, leftX, cursorY + 42);
    doc.text(`To'lov muddati: ${dateStr(dueDate)}`, leftX, cursorY + 56);
    if (project?.name) {
      doc.text(`Loyiha: ${project.name}`, leftX, cursorY + 70);
    }

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
    doc.text("Holat va valyuta", rightX, cursorY);
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text("Holat: Kutilmoqda", rightX, cursorY + 14);
    doc.text("To'lov shartlari: 7 kun ichida", rightX, cursorY + 28);
    doc.text(`Valyuta: ${invoice.currency}`, rightX, cursorY + 42);

    doc.moveDown(6);

    // 3) FROM / BILL TO — saytdagi kabi "FROM (Tomonidan)" va "BILL TO (Kimga)"
    cursorY = doc.y;
    const colWidth = (A4_WIDTH - PAGE_MARGIN * 2 - 20) / 2;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
    doc.text("FROM (Tomonidan)", leftX, cursorY);
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text(s.companyName, leftX, cursorY + 14, { width: colWidth });
    doc.text(s.address, leftX, cursorY + 26, { width: colWidth });
    doc.text(s.phone, leftX, cursorY + 38, { width: colWidth });
    doc.text(`${s.email} • ${s.website}`, leftX, cursorY + 50, { width: colWidth });

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
    doc.text("BILL TO (Kimga)", leftX + colWidth + 20, cursorY);
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    doc.text("Mijoz ismi", leftX + colWidth + 20, cursorY + 14, { width: colWidth });
    doc.text("Kompaniya", leftX + colWidth + 20, cursorY + 26, { width: colWidth });
    doc.text("Manzil, tel, email", leftX + colWidth + 20, cursorY + 38, { width: colWidth });

    doc.moveDown(7);

    // 4) SERVICES TABLE
    const tableStartY = doc.y;
    const tableCols = {
      index: PAGE_MARGIN,
      service: PAGE_MARGIN + 30,
      qty: PAGE_MARGIN + 260,
      unit: PAGE_MARGIN + 340,
      subtotal: PAGE_MARGIN + 430,
      right: A4_WIDTH - PAGE_MARGIN,
    };

    doc.save();
    doc.rect(
      tableCols.index,
      tableStartY,
      tableCols.right - tableCols.index,
      18
    ).fill("#F2F2F2");
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
    doc.text("T/r", tableCols.index + 2, tableStartY + 5);
    doc.text("Xizmat nomi", tableCols.service, tableStartY + 5);
    doc.text("Soni", tableCols.qty, tableStartY + 5, { width: 50, align: "right" });
    doc.text("Narx", tableCols.unit, tableStartY + 5, { width: 70, align: "right" });
    doc.text("Summa", tableCols.subtotal, tableStartY + 5, { width: 80, align: "right" });

    let y = tableStartY + 22;
    doc.moveTo(tableCols.index, y).lineTo(tableCols.right, y).stroke();

    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    let subtotal = 0;
    const rowHeight = 18;

    items.forEach((item, i) => {
      const sum = Number(item.quantity) * Number(item.unitPrice);
      subtotal += sum;
      doc.text(String(i + 1), tableCols.index + 2, y + 4);
      doc.text(item.title, tableCols.service, y + 4, {
        width: tableCols.qty - tableCols.service - 10,
        ellipsis: true,
      });
      doc.text(String(item.quantity), tableCols.qty, y + 4, { width: 50, align: "right" });
      doc.text(formatNum(item.unitPrice), tableCols.unit, y + 4, { width: 70, align: "right" });
      doc.text(formatNum(String(sum)), tableCols.subtotal, y + 4, { width: 80, align: "right" });
      y += rowHeight;
    });

    doc.moveTo(tableCols.index, y).lineTo(tableCols.right, y).stroke();

    // 5) TOTAL SECTION
    y += 8;
    const totalBlockX = tableCols.subtotal - 40;
    doc.moveTo(totalBlockX, y).lineTo(tableCols.right, y).lineWidth(1.5).stroke();
    y += 6;

    const amountBoxWidth = 100;
    const amountBoxX = tableCols.right - amountBoxWidth;
    doc.font("Helvetica").fontSize(10);
    doc.text("Subtotal:", totalBlockX, y, { width: 80, align: "right" });
    doc.text(formatNum(String(subtotal)) + " " + invoice.currency, amountBoxX, y, {
      width: amountBoxWidth,
      align: "right",
    });
    y += 14;
    doc.text("Tax:", totalBlockX, y, { width: 80, align: "right" });
    doc.text("0.00 " + invoice.currency, amountBoxX, y, {
      width: amountBoxWidth,
      align: "right",
    });
    y += 14;
    doc.text("Discount:", totalBlockX, y, { width: 80, align: "right" });
    doc.text("0.00 " + invoice.currency, amountBoxX, y, {
      width: amountBoxWidth,
      align: "right",
    });

    y += 18;
    doc.font("Helvetica-Bold").fontSize(14);
    const jamiText = `JAMI: ${formatNum(invoice.amount)} ${invoice.currency}`;
    doc.text(jamiText, totalBlockX, y, { width: tableCols.right - totalBlockX, align: "right" });

    // 6) PAYMENT INFORMATION
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(11).text("Payment Details");
    doc.font("Helvetica").fontSize(10);
    let paymentDetailLines: { title: string; value: string }[] = [];
    if (settings?.paymentDetailLines && settings.paymentDetailLines.trim()) {
      try {
        const parsed = JSON.parse(settings.paymentDetailLines) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          paymentDetailLines = parsed.filter(
            (x: unknown): x is { title: string; value: string } =>
              x != null && typeof x === "object" && "title" in x && "value" in x
          ).map((x) => ({ title: String(x.title), value: String(x.value) }));
        }
      } catch {
        /* ignore */
      }
    }
    const paymentWidth = A4_WIDTH - PAGE_MARGIN * 2;
    if (paymentDetailLines.length > 0) {
      paymentDetailLines.forEach((line) => {
        const label = line.title ? `${line.title}: ${line.value}` : line.value;
        if (label) doc.text(label, { width: paymentWidth, continued: false });
      });
    } else {
      doc.text(`Bank nomi: ${s.bankName}`, { width: paymentWidth });
      doc.text(`Hisob raqami: ${s.accountNumber}`, { width: paymentWidth });
    }
    doc.text(s.paymentNote, { width: paymentWidth });

    // 7) DIGITAL STAMP & SIGNATURE
    const stampCenterX = A4_WIDTH - PAGE_MARGIN - 70;
    const stampCenterY = 780;
    const stampRadius = 40;

    doc.save();
    doc.circle(stampCenterX, stampCenterY, stampRadius).lineWidth(1.5).strokeColor("#2563eb").stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#2563eb");
    doc.text("SAYD.X", stampCenterX - 25, stampCenterY - 10, { width: 50, align: "center" });
    doc.font("Helvetica").fontSize(8);
    doc.text("VERIFIED", stampCenterX - 25, stampCenterY + 2, { width: 50, align: "center" });
    doc.text(`ID: ${validationId}`, stampCenterX - 25, stampCenterY + 12, { width: 50, align: "center" });
    doc.text(`Date: ${issueDate.toLocaleDateString("uz-UZ")}`, stampCenterX - 25, stampCenterY + 22, {
      width: 50,
      align: "center",
    });
    doc.restore();

    const signLineX = stampCenterX - 45;
    const signImageY = stampCenterY + stampRadius + 18;
    const imzoPath = fs.existsSync(IMZO_PATH) ? IMZO_PATH : fs.existsSync(IMZO_PATH_LOWER) ? IMZO_PATH_LOWER : null;
    if (imzoPath) {
      doc.image(imzoPath, signLineX, signImageY, { height: SIGNATURE_IMAGE_HEIGHT });
    }
    const signLineY = imzoPath ? signImageY + SIGNATURE_IMAGE_HEIGHT + 6 : signImageY + 4;
    if (!imzoPath) {
      doc.moveTo(signLineX, signLineY).lineTo(signLineX + 120, signLineY).strokeColor("#000000").stroke();
    }
    doc.font("Helvetica").fontSize(9).fillColor("#000000");
    doc.text(s.authorizedName, signLineX, signLineY + 4);
    doc.text(s.authorizedPosition, signLineX, signLineY + 16);
    doc.text(dateStr(issueDate), signLineX, signLineY + 28);

    // 8) FOOTER
    doc.fontSize(9).fillColor("#555555");
    doc.text(
      `${s.website}  •  ${s.email}  •  Generated by S-UBOS System  •  Invoice ID: ` + validationId,
      PAGE_MARGIN,
      820,
      { width: A4_WIDTH - PAGE_MARGIN * 2, align: "center" }
    );

    doc.end();
    stream.on("finish", () => resolve(`/api/invoices/${invoice.id}/pdf`));
    stream.on("error", reject);
    doc.on("error", reject);
  });
}

function formatNum(s: string): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(Number(s));
}

export function getInvoicePdfPath(invoiceId: number): string | null {
  const dir = UPLOAD_DIR;
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const match = files.find((f) => f.startsWith(`chek-`) && f.endsWith(`-${invoiceId}.pdf`));
  return match ? path.join(dir, match) : null;
}
