import type { InvoiceForPdf, InvoiceItemForPdf, ProjectForPdf, InvoiceSettingsForPdf } from "./invoicePdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "invoices");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSettings(s: InvoiceSettingsForPdf) {
  const defaults = {
    companyName: "SAYD.X LLC",
    address: "Toshkent, O'zbekiston",
    phone: "+998 90 000 00 00",
    email: "info@saydx.uz",
    website: "saydx.uz",
    paymentNote: "To'lov shartnoma asosida amalga oshiriladi.",
    authorizedName: "Authorized Name",
    authorizedPosition: "Position",
    paymentDetailLines: [
      { title: "Bank nomi", value: "Your Bank Name" },
      { title: "Hisob raqami", value: "1234 5678 9012 3456" },
    ],
  };
  if (!s) return defaults;

  let paymentDetailLines = defaults.paymentDetailLines;
  if (s.paymentDetailLines && s.paymentDetailLines.trim()) {
    try {
      const arr = JSON.parse(s.paymentDetailLines);
      if (Array.isArray(arr) && arr.length > 0) {
        paymentDetailLines = arr.map((x: any) => ({
          title: String(x.title || ""),
          value: String(x.value || ""),
        }));
      }
    } catch {
      /* ignore */
    }
  }

  return {
    companyName: s.companyName ?? defaults.companyName,
    address: s.address ?? defaults.address,
    phone: s.phone ?? defaults.phone,
    email: s.email ?? defaults.email,
    website: s.website ?? defaults.website,
    paymentNote: s.paymentNote ?? defaults.paymentNote,
    authorizedName: s.authorizedName ?? defaults.authorizedName,
    authorizedPosition: s.authorizedPosition ?? defaults.authorizedPosition,
    paymentDetailLines,
  };
}

function formatAmount(amt: string | number, currency: string) {
  const n = typeof amt === "string" ? Number(amt) : amt;
  const formatted = new Intl.NumberFormat("uz-UZ", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${formatted} ${currency}`;
}

function monthlyBreakdown(start: Date, months: number, unitPrice: string, currency: string) {
  const res = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);

    const period = `${d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" })} - ${end.toLocaleDateString(
      "uz-UZ",
      { day: "2-digit", month: "2-digit", year: "numeric" }
    )}`;
    res.push({ period, amount: formatAmount(unitPrice, currency) });
  }
  return res;
}

function buildInvoiceHtml(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf,
  baseUrl: string
) {
  const s = getSettings(settings);
  const issueDate = new Date(invoice.createdAt);
  const dueDate = new Date(invoice.dueDate);
  const validationId = `INV-${invoice.id.toString().padStart(6, "0")}`;
  const dateStr = (d: Date) => d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");

  // Helper to escape HTML to prevent XSS in the generated PDF if data comes from user
  const esc = (str: string | null | undefined) => (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const logoUrl = `${baseUrl}/LOGO2.png`;
  const imzoUrl = `${baseUrl}/imzo.PNG`;
  const currency = invoice.currency || "UZS";

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0f172a;
      --secondary: #334155;
      --accent: #2563eb;
      --gold: #d4af37;
      --text-main: #1e293b;
      --text-light: #64748b;
      --white: #ffffff;
      --bg-soft: #f8fafc;
      --border: #e2e8f0;
      
      /* Status Mapping */
      --status-paid: #10b981;
      --status-pending: #f59e0b;
      --status-unpaid: #ef4444;
    }
    
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Inter', sans-serif; 
      color: var(--text-main); 
      background: #fff;
      line-height: 1.5;
    }
    h1, h2, h3, .brand, .totals-label { font-family: 'Outfit', sans-serif; }

    .pdf-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
      position: relative;
    }

    /* TOP HEADER - DARK PREMIUM */
    .premium-header {
      background: var(--primary);
      color: var(--white);
      padding: 50px 60px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .premium-header::after {
      content: ""; position: absolute; top: 0; right: 0;
      width: 150px; height: 150px;
      background: rgba(255,255,255,0.03);
      border-radius: 50%; transform: translate(50%, -50%);
    }

    .brand-section { display: flex; align-items: center; gap: 20px; }
    .logo-img { height: 70px; filter: brightness(0) invert(1); }
    .brand-title { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
    
    .header-info { text-align: right; }
    .doc-type { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.7; margin-bottom: 5px; }
    .inv-number { font-size: 34px; font-weight: 800; margin: 0; }

    /* CONTENT BODY */
    .content-body { padding: 40px 60px; }

    /* STATUS BAR */
    .status-bar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid var(--border);
    }
    .status-badge {
      padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .badge-paid { background: #ecfdf5; color: var(--status-paid); }
    .badge-pending { background: #fffbeb; color: var(--status-pending); }
    .badge-unpaid { background: #fef2f2; color: var(--status-unpaid); }

    .dates-row { display: flex; gap: 40px; }
    .date-item { font-size: 13px; }
    .date-label { color: var(--text-light); font-weight: 600; margin-right: 8px; }
    .date-val { font-weight: 700; color: var(--primary); }

    /* PARTY SECTION */
    .party-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 60px;
      margin-bottom: 50px;
    }
    .party-box h4 {
      font-size: 11px; font-weight: 800; color: var(--text-light);
      text-transform: uppercase; letter-spacing: 0.15em;
      margin: 0 0 15px 0; border-bottom: 2px solid var(--border);
      padding-bottom: 8px; display: inline-block;
    }
    .party-name { font-size: 18px; font-weight: 800; color: var(--primary); margin-bottom: 8px; }
    .party-details { font-size: 13px; color: var(--secondary); line-height: 1.6; }

    /* TABLE DESIGN */
    .table-section { margin-bottom: 40px; }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left; background: var(--bg-soft);
      padding: 15px 20px; font-size: 12px; font-weight: 800;
      color: var(--text-light); text-transform: uppercase; letter-spacing: 0.1em;
    }
    .item-row td { padding: 20px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row-nr { width: 40px; color: var(--text-light); font-weight: 700; }
    .row-title { font-weight: 700; color: var(--primary); font-size: 15px; }
    .row-meta { font-size: 11px; color: var(--accent); font-weight: 800; text-transform: uppercase; margin-top: 2px; }
    .text-right { text-align: right; }
    .price-col { font-weight: 600; color: var(--primary); }

    /* SUMMARY section */
    .summary-grid {
      display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px;
      page-break-inside: avoid;
    }
    .payment-instructions {
      background: var(--bg-soft); border-radius: 12px; padding: 25px;
    }
    .payment-instructions h4 {
      margin: 0 0 15px 0; font-size: 12px; font-weight: 800; color: var(--secondary);
      text-transform: uppercase;
    }
    .pay-detail { font-size: 13px; margin-bottom: 8px; display: flex; }
    .pay-label { color: var(--text-light); width: 100px; flex-shrink: 0; }
    .pay-val { font-weight: 700; color: var(--primary); }
    .pay-note {
      margin-top: 15px; font-size: 12px; font-weight: 600; color: var(--accent);
      padding-top: 15px; border-top: 1px dashed var(--border);
    }

    .totals-box { display: flex; flex-direction: column; gap: 12px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; }
    .total-divider { height: 1px; background: var(--border); margin: 8px 0; }
    .grand-total {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 10px; padding: 15px 0;
    }
    .grand-total-label { font-size: 20px; font-weight: 800; color: var(--primary); }
    .grand-total-val { font-size: 28px; font-weight: 800; color: var(--accent); }

    /* SIGNATURE & SEAL */
    .auth-section {
      margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;
      page-break-inside: avoid; border-top: 1px solid var(--border); padding-top: 40px;
    }
    .seal-wrap {
      width: 140px; height: 140px; border: 3px solid var(--accent); border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transform: rotate(-10deg); color: var(--accent); border-style: double;
    }
    .seal-brand { font-size: 16px; font-weight: 900; line-height: 1; }
    .seal-ver { font-size: 8px; font-weight: 800; letter-spacing: 0.3em; margin-top: 5px; }

    .signature-wrap { text-align: right; }
    .sig-img { height: 75px; margin-bottom: 10px; opacity: 0.9; }
    .sig-name { font-size: 16px; font-weight: 800; color: var(--primary); margin: 0; }
    .sig-pos { font-size: 12px; color: var(--text-light); font-weight: 600; margin: 4px 0; }

    /* FOOTER */
    .footer {
      margin-top: 80px; text-align: center; color: var(--text-light); font-size: 11px;
      padding-bottom: 40px;
    }
    .footer-links { font-weight: 700; margin-bottom: 8px; color: var(--secondary); }

  </style>
</head>
<body>
  <div class="pdf-container">
    <header class="premium-header">
      <div class="brand-section">
        <img src="${esc(logoUrl)}" class="logo-img" alt="SAYD.X">
        <div class="brand-title">SAYD.X</div>
      </div>
      <div class="header-info">
        <div class="doc-type">Official Invoice</div>
        <h1 class="inv-number">№ ${esc(invoice.invoiceNumber)}</h1>
      </div>
    </header>

    <main class="content-body">
      <section class="status-bar">
        <div class="status-badge ${invoice.status === "paid" ? "badge-paid" :
      invoice.status === "pending" ? "badge-pending" : "badge-unpaid"
    }">
          ${invoice.status === "paid" ? "Muvaffaqiyatli To'langan" :
      invoice.status === "pending" ? "To'lov Kutilmoqda" : "To'lanmagan / Bekor qilingan"
    }
        </div>
        <div class="dates-row">
          <div class="date-item"><span class="date-label">ISSUE DATE:</span><span class="date-val">${dateStr(issueDate)}</span></div>
          <div class="date-item"><span class="date-label">DUE DATE:</span><span class="date-val">${dateStr(dueDate)}</span></div>
        </div>
      </section>

      <section class="party-grid">
        <div class="party-box">
          <h4>From / Bajaruvchi</h4>
          <div class="party-name">${esc(s.companyName)}</div>
          <div class="party-details">
            ${esc(s.address)}<br>
            ${esc(s.email)}<br>
            ${esc(s.phone)}<br>
            ${esc(s.website)}
          </div>
        </div>
        <div class="party-box">
          <h4>Bill To / Buyurtmachi</h4>
          <div class="party-name">${esc(invoice.clientName || "Mijoz")}</div>
          <div class="party-details">
            <span style="font-weight: 700">${esc(invoice.company || "Xususiy Shaxs")}</span><br>
            ${esc(invoice.billToContact || "—")}<br>
            <span style="color: var(--accent); font-weight: 600;">Loyiha: ${project?.name ? esc(project.name) : "—"}</span>
          </div>
        </div>
      </section>

      <section class="table-section">
        <table>
          <thead>
            <tr>
              <th class="row-nr">#</th>
              <th>Xizmat Ta'rifi va Tavsifi</th>
              <th class="text-right">Hajm</th>
              <th class="text-right">Birlik Narxi</th>
              <th class="text-right">Jami Summa</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr class="item-row">
                <td class="row-nr">${i + 1}</td>
                <td>
                  <div class="row-title">${esc(item.title)}</div>
                  ${item.serviceType ? `<div class="row-meta">${esc(item.serviceType)} Services</div>` : ""}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right price-col">${formatAmount(item.unitPrice, currency)}</td>
                <td class="text-right price-col" style="color: var(--accent)">${formatAmount(String(Number(item.quantity) * Number(item.unitPrice)), currency)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>

      <section class="summary-grid">
        <div class="payment-instructions">
          <h4>To'lov Rekvizitlari</h4>
          ${s.paymentDetailLines.map(l => `
            <div class="pay-detail">
              <span class="pay-label">${esc(l.title || "Ma'lumot")}:</span>
              <span class="pay-val">${esc(l.value)}</span>
            </div>
          `).join("")}
          <div class="pay-note">${esc(s.paymentNote)}</div>
        </div>

        <div class="totals-box">
          <div class="total-row">
            <span style="color: var(--text-light)">Umumiy Xizmatlar:</span>
            <span style="font-weight: 700">${formatAmount(invoice.amount, currency)}</span>
          </div>
          <div class="total-row">
            <span style="color: var(--text-light)">Soliq va Yig'imlar (0%):</span>
            <span style="font-weight: 700">0.00 ${currency}</span>
          </div>
          <div class="total-divider"></div>
          <div class="grand-total">
            <span class="grand-total-label">JAMI TO'LOV:</span>
            <span class="grand-total-val">${formatAmount(invoice.amount, currency)}</span>
          </div>
        </div>
      </section>

      <footer class="auth-section">
        <div class="seal-wrap">
          <div class="seal-brand">SAYD.X</div>
          <div class="seal-ver">OFFICIAL SEAL</div>
          <div style="font-size: 8px; margin-top: 5px;">${validationId}</div>
        </div>
        
        <div class="signature-wrap">
          <img src="${esc(imzoUrl)}" class="sig-img" alt="Electronic Signature">
          <p class="sig-name">${esc(s.authorizedName)}</p>
          <p class="sig-pos">${esc(s.authorizedPosition)}</p>
          <div style="font-size: 11px; color: var(--text-light); margin-top: 5px;">Toshkent, ${dateStr(new Date())} y.</div>
        </div>
      </footer>
    </main>

    <footer class="footer">
      <div class="footer-links">
        ${esc(s.website)} &nbsp; | &nbsp; ${esc(s.email)} &nbsp; | &nbsp; ${esc(s.phone)}
      </div>
      <div>&copy; ${new Date().getFullYear()} SAYD.X DIGITAL SOLUTIONS. Generated by internal ERP system.</div>
    </footer>
  </div>
</body>
</html>`;
}

/** Generate PDF via Puppeteer — A4, ko'p sahifa (uzun jadval keyingi sahifada davom etadi). */
export async function generateInvoicePdfPuppeteer(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf,
  widthPx: number,
  _heightPx: number,
  baseUrl: string
): Promise<string> {
  ensureDir(UPLOAD_DIR);
  const filename = `chek-${invoice.invoiceNumber.replace(/\s/g, "-")}-${invoice.id}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const html = buildInvoiceHtml(invoice, items, project, settings, baseUrl);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    await page.setViewport({ width: Math.round(widthPx), height: 1200 });

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },
    });
  } finally {
    await browser.close();
  }

  return `/api/invoices/${invoice.id}/pdf`;
}
