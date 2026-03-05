import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Ranglar: yashil, sariq, qizil — status uchun
const GREEN: [number, number, number] = [34, 197, 94]; // #22c55e
const YELLOW: [number, number, number] = [234, 179, 8]; // #eab308
const RED: [number, number, number] = [239, 68, 68]; // #ef4444

const TEXT: [number, number, number] = [17, 17, 17];
const TEXT_MUTED: [number, number, number] = [85, 85, 85];
const TEXT_LIGHT: [number, number, number] = [136, 136, 136];
const ACCENT: [number, number, number] = [37, 99, 235];
const BORDER: [number, number, number] = [229, 231, 235];
const BG_SUBTLE: [number, number, number] = [249, 250, 251];
const BG_CARD: [number, number, number] = [248, 250, 252];

const S8 = 3;
const S16 = 6;
const S24 = 9;

export type PaymentDetailLine = { title: string; value: string };
export type InvoiceSettingsType = {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  accountNumber: string;
  paymentDetailLines?: PaymentDetailLine[];
  paymentNote: string;
  authorizedName: string;
  authorizedPosition: string;
};

export type InvoiceItemPdf = {
  title: string;
  quantity: number;
  unitPrice: string;
  serviceType?: string | null;
  startDate?: string | Date | null;
  projectId?: number | null;
  projectName?: string | null;
};

export type InvoicePdfData = {
  invoice: {
    id: number;
    invoiceNumber: string;
    amount: string;
    currency: string;
    status?: string | null;
    dueDate: string | Date;
    createdAt: string | Date;
    clientName?: string | null;
    company?: string | null;
    billToContact?: string | null;
    paymentTerms?: string | null;
    contractPartner?: string | null;
    contractStartDate?: string | Date | null;
    contractEndDate?: string | Date | null;
  };
  items: InvoiceItemPdf[];
  projectName?: string;
  settings: InvoiceSettingsType;
  paymentDetailLines?: PaymentDetailLine[];
};

const formatNum = (n: number) =>
  new Intl.NumberFormat("uz-UZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const dateStr = (d: Date | string) =>
  new Date(d)
    .toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, ".");

/** Qolgan oylar: startDate + quantity oydan keyin tugaydi, bugundan qolgan oylar */
function remainingMonths(startDate: Date | string, quantityMonths: number): number {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + quantityMonths);
  const now = new Date();
  if (end <= now) return 0;
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, months);
}

async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const pxPerMm = 96 / 25.4;
      resolve({ w: img.naturalWidth / pxPerMm, h: img.naturalHeight / pxPerMm });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function drawStatusBadge(
  doc: jsPDF,
  x: number,
  y: number,
  status: string | null | undefined
): void {
  const [label, r, g, b] =
    status === "paid"
      ? ["To'langan", ...GREEN]
      : status === "pending"
      ? ["Kutilmoqda", ...YELLOW]
      : ["To'lanmadi", ...RED];
  doc.setFillColor(r, g, b);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.15);
  doc.roundedRect(x, y, 22, 6, 1, 1, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + 11, y + 4, { align: "center" });
}

export async function generateInvoicePdf(data: InvoicePdfData, filename: string): Promise<void> {
  const { invoice, items, projectName, settings, paymentDetailLines = [] } = data;
  const fname = filename.replace(/[^a-zA-Z0-9\-_.]/g, "_");
  const safeName = fname.endsWith(".pdf") ? fname : `${fname}.pdf`;

  const issueDate = new Date(invoice.createdAt);
  const validationId = `INV-${invoice.id.toString().padStart(6, "0")}`;

  const rowItems = items.filter((i) => !i.serviceType || i.serviceType === "row");
  const serverItems = items.filter((i) => i.serviceType === "server");
  const apiItems = items.filter((i) => i.serviceType === "api");

  let subtotal = 0;
  items.forEach((item) => {
    subtotal += Number(item.quantity) * Number(item.unitPrice);
  });
  const tax = 0;
  const discount = 0;
  const total = Number(invoice.amount) || subtotal;

  const lines =
    paymentDetailLines.length > 0
      ? paymentDetailLines
      : [
          { title: "Bank nomi", value: settings.bankName },
          { title: "Hisob raqami", value: settings.accountNumber },
        ];

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = MARGIN;

  // Header
  try {
    const logoB64 = await loadImageAsBase64("/LOGO2.png");
    const dim = await getImageSize(logoB64);
    const logoH = 12;
    const logoW = Math.min((dim.w / dim.h) * logoH, 45);
    doc.addImage(logoB64, "PNG", MARGIN, y, logoW, logoH);
  } catch {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("SAYD.X", MARGIN, y + 6);
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text("HISOB-FAKTURA", PAGE_W - MARGIN, y + 8, { align: "right" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 16, PAGE_W - MARGIN, y + 16);
  y += 20;

  const colW = (CONTENT_W - S16) / 2;
  const pad = 4;

  // Info grid
  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, y, colW, 32, 2, 2, "FD");
  doc.roundedRect(MARGIN + colW + S16, y, colW, 32, 2, 2, "FD");

  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("HISOB-FAKTURA MA'LUMOTLARI", MARGIN + pad, y + 6);
  doc.text("HOLAT VA VALYUTA", MARGIN + colW + S16 + pad, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  const leftInfo = [
    `Raqam: ${invoice.invoiceNumber}`,
    `ID: ${validationId}`,
    `Sana: ${dateStr(issueDate)}`,
    `To'lov muddati: ${dateStr(invoice.dueDate)}`,
    projectName ? `Loyiha: ${projectName}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  doc.text(leftInfo, MARGIN + pad, y + 14);

  doc.text("Holat:", MARGIN + colW + S16 + pad, y + 12);
  drawStatusBadge(doc, MARGIN + colW + S16 + 20, y + 9, invoice.status);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`To'lov shartlari: ${invoice.paymentTerms || "7 kun ichida"}`, MARGIN + colW + S16 + pad, y + 20);
  doc.text(`Valyuta: ${invoice.currency}`, MARGIN + colW + S16 + pad, y + 26);
  y += 36;

  // Shartnoma bo'yicha
  const hasContract =
    invoice.contractPartner || invoice.contractStartDate || invoice.contractEndDate;
  if (hasContract) {
    doc.setFillColor(BG_CARD[0], BG_CARD[1], BG_CARD[2]);
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "FD");
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
    doc.text("SHARTNOMA MA'LUMOTLARI", MARGIN + pad, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    const contractParts: string[] = [];
    if (invoice.contractPartner) contractParts.push(`Kim bn: ${invoice.contractPartner}`);
    if (invoice.contractStartDate)
      contractParts.push(`Boshlanish: ${dateStr(invoice.contractStartDate)}`);
    if (invoice.contractEndDate) contractParts.push(`Tugash: ${dateStr(invoice.contractEndDate)}`);
    contractParts.push(`Valyuta: ${invoice.currency}`);
    doc.text(contractParts.join("  |  "), MARGIN + pad, y + 12);
    y += 22;
  }

  // FROM / BILL TO
  doc.setFillColor(BG_CARD[0], BG_CARD[1], BG_CARD[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, y, colW, 30, 2, 2, "FD");
  doc.roundedRect(MARGIN + colW + S16, y, colW, 30, 2, 2, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("FROM (Tomonidan)", MARGIN + pad, y + 6);
  doc.text("BILL TO (Kimga)", MARGIN + colW + S16 + pad, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(
    [settings.companyName, settings.address, settings.phone, `${settings.email} • ${settings.website}`].join("\n"),
    MARGIN + pad,
    y + 14
  );
  doc.text(
    [invoice.clientName || "—", invoice.company || "—", invoice.billToContact || "—"].join("\n"),
    MARGIN + colW + S16 + pad,
    y + 14
  );
  y += 34;

  const cw = [10, 60, 22, 28, 40];
  const tableOpts = (head: string[][], body: (string | number)[][]) => ({
    head,
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
    tableLineColor: BORDER as unknown as [number, number, number],
    tableLineWidth: 0.15,
    columnStyles: {
      0: { cellWidth: cw[0], halign: "left" as const, cellPadding: 2 },
      1: { cellWidth: cw[1], halign: "left" as const, cellPadding: 2 },
      2: { cellWidth: cw[2], halign: "right" as const, cellPadding: 2 },
      3: { cellWidth: cw[3], halign: "right" as const, cellPadding: 2 },
      4: { cellWidth: cw[4], halign: "right" as const, fontStyle: "bold" as const, cellPadding: 2 },
    },
    headStyles: {
      fillColor: ACCENT as unknown as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 6,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 6, cellPadding: 3, textColor: TEXT as unknown as [number, number, number] },
    alternateRowStyles: { fillColor: BG_SUBTLE as unknown as [number, number, number] },
    showHead: "everyPage" as const,
    rowPageBreak: "avoid" as const,
  });

  // 1. Qator xizmatlari
  if (rowItems.length > 0) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("QATOR XIZMATLARI", MARGIN, y + 4);
    y += 6;
    const head = [["T/r", "Xizmat nomi", "Soni", "Narx", "Summa"]];
    const body = rowItems.map((item, i) => {
      const sum = Number(item.quantity) * Number(item.unitPrice);
      return [
        String(i + 1),
        item.title,
        String(item.quantity),
        formatNum(Number(item.unitPrice)),
        formatNum(sum),
      ];
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, tableOpts(head, body) as any);
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + S16;
  }

  // 2. Server xizmatlari
  if (serverItems.length > 0) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("SERVER XIZMATLARI", MARGIN, y + 4);
    y += 6;
    const head = [["T/r", "Loyiha / Xizmat", "Oylar", "1 oy narxi", "Summa"]];
    const body = serverItems.map((item, i) => {
      const sum = Number(item.quantity) * Number(item.unitPrice);
      const start = item.startDate ? new Date(item.startDate) : null;
      const qolganStr = start ? ` (qolgan: ${remainingMonths(start, item.quantity)} oy)` : "";
      return [
        String(i + 1),
        item.projectName ? `${item.projectName} / ${item.title}` : item.title,
        String(item.quantity) + " oy" + qolganStr,
        formatNum(Number(item.unitPrice)),
        formatNum(sum),
      ];
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, tableOpts(head, body) as any);
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + S16;
  }

  // 3. API xizmatlari
  if (apiItems.length > 0) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text("API XIZMATLARI", MARGIN, y + 4);
    y += 6;
    const head = [["T/r", "Loyiha / Xizmat", "Oylar", "1 oy narxi", "Summa"]];
    const body = apiItems.map((item, i) => {
      const sum = Number(item.quantity) * Number(item.unitPrice);
      const start = item.startDate ? new Date(item.startDate) : null;
      const qolganStr = start ? ` (qolgan: ${remainingMonths(start, item.quantity)} oy)` : "";
      return [
        String(i + 1),
        item.projectName ? `${item.projectName} / ${item.title}` : item.title,
        String(item.quantity) + " oy" + qolganStr,
        formatNum(Number(item.unitPrice)),
        formatNum(sum),
      ];
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable(doc, tableOpts(head, body) as any);
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + S24;
  } else if (rowItems.length > 0 || serverItems.length > 0) {
    y += S8;
  }

  const pageH = doc.internal.pageSize.getHeight();
  if (y + 95 > pageH - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }

  // Summary
  const sumW = 60;
  const sumX = PAGE_W - MARGIN - sumW;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Subtotal", sumX, y + 5);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(subtotal)} ${invoice.currency}`, PAGE_W - MARGIN, y + 5, { align: "right" });
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Tax", sumX, y + 10);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(tax)} ${invoice.currency}`, PAGE_W - MARGIN, y + 10, { align: "right" });
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Discount", sumX, y + 15);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(`${formatNum(discount)} ${invoice.currency}`, PAGE_W - MARGIN, y + 15, { align: "right" });
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.line(sumX, y + 19, PAGE_W - MARGIN, y + 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text("JAMI", sumX, y + 26);
  doc.text(`${formatNum(total)} ${invoice.currency}`, PAGE_W - MARGIN, y + 26, { align: "right" });
  y += 32;

  // Payment info
  const paymentText =
    lines.map((l) => (l.title ? `${l.title}: ${l.value}` : l.value)).join("\n") + "\n" + settings.paymentNote;
  const paymentLines = doc.splitTextToSize(paymentText, CONTENT_W - 12);
  const paymentH = 8 + paymentLines.length * 4;
  doc.setFillColor(BG_SUBTLE[0], BG_SUBTLE[1], BG_SUBTLE[2]);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, paymentH, 2, 2, "FD");
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text("To'lov ma'lumotlari", MARGIN + pad, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(paymentLines, MARGIN + pad, y + 10);
  y += paymentH + S16;

  // Signature
  const sigX = MARGIN + 55;
  let sigY = y;
  try {
    const imzoB64 = await loadImageAsBase64("/imzo.PNG");
    doc.addImage(imzoB64, "PNG", sigX, sigY, 14, 8);
    sigY += 11;
  } catch {}
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(settings.authorizedName, sigX, sigY);
  doc.text(settings.authorizedPosition, sigX, sigY + 4);
  doc.text(dateStr(issueDate), sigX, sigY + 8);
  const stampR = 7;
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.2);
  doc.circle(MARGIN + stampR + 5, y + stampR + 4, stampR);
  doc.circle(MARGIN + stampR + 5, y + stampR + 4, stampR - 1.5);
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.text("SAYD.X", MARGIN + stampR + 5, y + stampR + 2, { align: "center" });
  doc.text("VERIFIED", MARGIN + stampR + 5, y + stampR + 6, { align: "center" });
  y += 24;

  // Footer
  y += 10;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]);
  doc.text(
    `${settings.website} • ${settings.email} • Generated by SAYD.X • Invoice ID: ${validationId}`,
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  doc.save(safeName);
}
