export type InvoiceForPdf = {
  id: number;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status?: string;
  paymentTerms?: string;
  clientName?: string;
  company?: string;
  billToContact?: string;
  dueDate: Date;
  createdAt: Date;
  projectId: number;
  paidAmount?: string;
  vatRate?: string;
  discountRate?: string;
  verificationToken: string;
};

export type InvoiceItemForPdf = {
  title: string;
  quantity: number | string;
  paidQuantity: number | string;
  unitPrice: string | number;
  serviceType?: string;
  startDate?: Date | string;
};

export type ProjectForPdf = {
  name: string;
} | undefined;

export type InvoiceSettingsForPdf = {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  paymentDetailLines: string | null;
  paymentNote: string | null;
  authorizedName: string | null;
  authorizedPosition: string | null;
} | null;

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { format } from "date-fns";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "invoices");

// ─── Translation dictionary ────────────────────────────────────────────────
type Lang = "uz" | "en" | "ru";

const T: Record<string, Record<Lang, string>> = {
  officialInvoice: { uz: "RASMIY HISOB-FAKTURA", en: "OFFICIAL INVOICE", ru: "ОФИЦИАЛЬНЫЙ СЧЁТ" },
  issueDate: { uz: "Sana", en: "Issue Date", ru: "Дата выставления" },
  dueDate: { uz: "Muddat", en: "Due Date", ru: "Срок оплаты" },
  statusPaid: { uz: "To'langan", en: "Paid", ru: "Оплачено" },
  statusUnpaid: { uz: "To'lanmadi", en: "Unpaid", ru: "Не оплачено" },
  statusPending: { uz: "Kutilmoqda", en: "Pending", ru: "Ожидает оплаты" },
  from: { uz: "Bajaruvchi", en: "From / Contractor", ru: "От / Исполнитель" },
  billTo: { uz: "Buyurtmachi", en: "Bill To / Client", ru: "Кому / Заказчик" },
  project: { uz: "Loyiha", en: "Project", ru: "Проект" },
  serviceDesc: { uz: "XIZMAT TA'RIFI", en: "SERVICE DESCRIPTION", ru: "ОПИСАНИЕ УСЛУГИ" },
  start: { uz: "BOSHLANISH", en: "START", ru: "НАЧАЛО" },
  days: { uz: "KUN", en: "DAYS", ru: "ДНЕЙ" },
  end: { uz: "TUGASH", en: "END", ru: "ОКОНЧАНИЕ" },
  price: { uz: "NARXI (SUMMA)", en: "PRICE (AMOUNT)", ru: "Цена (Сумма)" },
  services: { uz: "XIZMATLAR", en: "SERVICES", ru: "УСЛУГИ" },
  subtotal: { uz: "JAMI", en: "SUBTOTAL", ru: "ИТОГО" },
  paymentDetails: { uz: "To'lov Rekvizitlari", en: "Payment Details", ru: "Реквизиты оплаты" },
  totalServices: { uz: "Umumiy Xizmatlar", en: "Total Services", ru: "Всего услуг" },
  grandTotal: { uz: "Jami To'lov", en: "Grand Total", ru: "Итоговая сумма" },
  noServices: { uz: "Xizmatlar qo'shilmagan...", en: "No services added...", ru: "Услуги не добавлены..." },
  authorized: { uz: "TASDIQLANGAN", en: "AUTHORIZED", ru: "УДОСТОВЕРЕНО" },
  city: { uz: "Toshkent", en: "Tashkent", ru: "Ташкент" },
  yr: { uz: "y.", en: "", ru: "г." },
  bankName: { uz: "Bank nomi", en: "Bank Name", ru: "Название банка" },
  accNo: { uz: "Hisob raqami", en: "Account No", ru: "Номер счета" },
  companyAddress: { uz: "Toshkent, O'zbekiston", en: "Tashkent, Uzbekistan", ru: "Ташкент, Узбекистан" },
  paymentNote: { uz: "To'lov shartnoma asosida amalga oshiriladi.", en: "Payment is made under the contract.", ru: "Оплата производится по договору." },
  authorizedName: { uz: "Mas'ul shaxs", en: "Authorized Name", ru: "Имя представителя" },
  authorizedPosition: { uz: "Lavozimi", en: "Position", ru: "Должность" },
  officialMerchantDoc: { uz: "RASMIY SAVDO HUJJATI", en: "OFFICIAL MERCHANT DOCUMENT", ru: "ОФИЦИАЛЬНЫЙ ТОРГОВЫЙ ДОКУМЕНТ" },
  contractDetails: { uz: "Shartnoma ma'lumotlari", en: "Contract Details", ru: "Данные договора" },
  contractParty: { uz: "Shartnoma tomoni", en: "Contracting Party", ru: "Сторона договора" },
};

function t(key: string, lang: Lang): string {
  return T[key]?.[lang] ?? T[key]?.["uz"] ?? key;
}
// ──────────────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSettings(s: InvoiceSettingsForPdf, lang: Lang) {
  const defaults = {
    companyName: "SAYD.X LLC",
    address: t('companyAddress', lang),
    phone: "+998 90 000 00 00",
    email: "info@saydx.uz",
    website: "saydx.uz",
    paymentNote: t('paymentNote', lang),
    authorizedName: t('authorizedName', lang),
    authorizedPosition: t('authorizedPosition', lang),
    paymentDetailLines: [
      { title: t('bankName', lang), value: "Your Bank Name" },
      { title: t('accNo', lang), value: "1234 5678 9012 3456" },
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

function buildInvoiceHtml(
  invoice: InvoiceForPdf,
  items: InvoiceItemForPdf[],
  project: ProjectForPdf,
  settings: InvoiceSettingsForPdf,
  baseUrl: string,
  lang: Lang = "uz",
  qrCodeDataUri: string
) {
  const s = getSettings(settings, lang);
  const dateStr = (d: string | Date | null) => {
    if (!d) return "---";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "---";
    const locale = lang === "uz" ? "uz-UZ" : lang === "en" ? "en-GB" : "ru-RU";
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
  };

  const esc = (val: any) => {
    const str = String(val || "");
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const currency = invoice.currency || "UZS";
  const logoUrl = `${baseUrl}/LOGO2.png`;
  const imzoUrl = `${baseUrl}/imzo.PNG`;

  // --- Robust Row Expansion and Categorical Grouping ---
  const validRows = items.filter(r => r.title && String(r.title).trim());
  const groupedRows: Record<string, any[]> = {};

    validRows.forEach(row => {
      const type = (row.serviceType || 'row').toLowerCase();
      let targetType = (type === 'api' || type === 'server') ? type : 'row';

      // Auto-detect from title for better grouping
      if (targetType === 'row' && row.title) {
        const tLow = String(row.title).toLowerCase();
        if (tLow.includes('api')) targetType = 'api';
        else if (tLow.includes('server')) targetType = 'server';
      }

      // Group key: if not 'row', include title to separate distinct services
      const groupKey = (targetType === 'row') ? 'row' : `${targetType.toUpperCase()}: ${String(row.title).toUpperCase()}`;
      if (!groupedRows[groupKey]) {
        groupedRows[groupKey] = [];
      }

      const repeats = Math.max(1, Number(row.paidQuantity) || 1);
      const duration = Math.max(1, Number(row.quantity) || 1);
      const unitPrice = Number(row.unitPrice) || 0;

      if (row.startDate) {
        let currentStart = new Date(row.startDate);
        for (let i = 0; i < repeats; i++) {
          const end = new Date(currentStart);
          end.setDate(end.getDate() + duration);

          groupedRows[groupKey].push({
            title: row.title,
            subTitle: (targetType === 'api' || targetType === 'server') ? targetType.toUpperCase() : '',
            startDate: dateStr(currentStart),
            endDate: dateStr(end),
            days: duration,
            price: unitPrice
          });
          currentStart = new Date(end);
        }
      } else {
        groupedRows[groupKey].push({
          title: row.title,
          subTitle: (targetType === 'api' || targetType === 'server') ? targetType.toUpperCase() : '',
          startDate: '---',
          endDate: '---',
          days: duration,
          price: unitPrice * repeats
        });
      }
    });

    const activeGroups = Object.keys(groupedRows).filter(gk => groupedRows[gk].length > 0);
    // Ensure 'row' comes last if it exists
    activeGroups.sort((a, b) => {
      if (a === 'row') return 1;
      if (b === 'row') return -1;
      return a.localeCompare(b);
    });

  // Grand total must match the sum of all expanded rows
  const totalAmount = Object.values(groupedRows)
    .flat()
    .reduce((sum: number, item: any) => sum + (item.price || 0), 0);

  // Seal Status Logic - Standardizing status values
  const rawStatus = (invoice.status || 'pending').toLowerCase();
  let sText = t('statusPending', lang);
  let sColor = '#d97706'; // Pending: Amber/Saffron

  if (rawStatus === 'paid') {
    sText = t('statusPaid', lang);
    sColor = '#059669';
  } else if (rawStatus === 'unpaid') {
    sText = t('statusUnpaid', lang);
    sColor = '#dc2626';
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { 
      margin: 0; padding: 0; 
      font-family: 'Inter', system-ui, sans-serif; 
      color: #1e293b; 
      background: #ffffff; 
    }
    .invoice-card {
      width: 100%; max-width: 800px; margin: 0 auto; background: white;
    }
    .header {
      background: #0f172a; color: white; padding: 40px 40px;
      display: flex; justify-content: space-between; align-items: center;
      position: relative; overflow: hidden;
    }
    .header-logo { height: 42px; filter: brightness(0) invert(1); vertical-align: middle; }
    .header-info { text-align: right; z-index: 10; position: relative; }
    .doc-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(255,255,255,0.6); margin-bottom: 2px; font-family: 'Outfit'; }
    .inv-no { font-size: 28px; font-weight: 900; margin: 0; font-family: 'Outfit'; color: white; letter-spacing: -0.025em; }
    .header-accent { position: absolute; top: 0; right: 0; width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%; transform: translate(50%, -50%); }

    .content { padding: 30px 0; }
    .footer-auth {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #f1f5f9;
        position: relative;
      }
      .qr-code-box {
        position: absolute;
        left: 50%;
        bottom: 10px;
        transform: translateX(-50%);
        text-align: center;
      }
      .qr-code-img {
        width: 80px;
        height: 80px;
        display: block;
        margin: 0 auto;
      }
      .qr-help-text {
        font-size: 7px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 4px;
      }
    .dates-row { 
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 30px;
    }
    .status-badge {
      padding: 6px 14px; border-radius: 6px; font-size: 10px; font-weight: 900;
      text-transform: uppercase; letter-spacing: 0.05em; border: 1.5px solid;
    }
    .status-paid { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .status-unpaid { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .status-pending { background: #fffbeb; color: #b45309; border-color: #fef3c7; }

    .date-item { display: inline-block; margin-left: 32px; }
    .date-label { color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-right: 8px; font-size: 10px; }
    .date-val { font-weight: 800; color: #0f172a; font-size: 13px; }

    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 30px; }
    .party-title { font-size: 9px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px; display: inline-block; font-family: 'Outfit'; }
    .party-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; font-family: 'Outfit'; }
    .details { font-size: 12px; color: #64748b; line-height: 1.6; }
    .pj-badge { background: #eff6ff; color: #2563eb; font-size: 9px; font-weight: 900; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }

    .table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f8fafc; padding: 12px 20px; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; text-align: left; border-bottom: 1px solid #e2e8f0; }
    
    .cat-header { background: #f8fafc; color: #3b82f6; font-size: 9px; font-weight: 900; padding: 10px 20px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #f1f5f9; }
    .item-row td { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: middle; }
    .row-title { font-weight: 700; color: #0f172a; margin-bottom: 1px; text-transform: uppercase; }
    .row-subtitle { font-size: 9px; color: #3b82f6; font-weight: 700; text-transform: uppercase; }
    
    .cat-total-row { background: #f1f5f9; }
    .cat-total-label { text-align: right; color: #64748b; font-size: 10px; font-weight: 800; padding: 8px 20px; text-transform: uppercase; }
    .cat-total-val { text-align: right; color: #0f172a; font-size: 11px; font-weight: 800; padding: 8px 20px; }

    .summary-section { display: grid; grid-template-columns: 1.25fr 1fr; gap: 40px; page-break-inside: avoid; }
    .payment-details-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .pay-title { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.1em; }
    .pay-row { font-size: 11px; margin-bottom: 4px; display: flex; }
    .pay-key { color: #94a3b8; font-weight: 700; width: 90px; }
    .pay-val { font-weight: 800; color: #0f172a; }
    .pay-note-box { border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; color: #3b82f6; font-weight: 800; font-style: italic; font-size: 11px; }

    .totals-box { display: flex; flex-direction: column; justify-content: flex-end; }
    .total-line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #64748b; }
    .grand-total-row { border-top: 2px solid #3b82f6; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; }
    .grand-label { font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
    .grand-value { font-size: 24px; font-weight: 900; color: #2563eb; font-family: 'Outfit'; }

    .footer-auth { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
    .auth-seal {
      width: 140px; height: 140px; 
      border: 4px double #000080; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transform: rotate(-12deg); color: #000080; position: relative;
      background: rgba(0, 0, 128, 0.01);
      overflow: visible;
      box-shadow: 0 0 0 2px #000080 inset;
      backdrop-filter: blur(0.5px);
    }
    .signature-area { text-align: right; }
    .signature-img { height: 50px; mix-blend-mode: multiply; margin-bottom: 5px; }
    .signatory-name { font-size: 13px; font-weight: 800; margin: 0; color: #0f172a; }
    .signatory-pos { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; }

    .legal-footer { margin-top: 60px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; padding-bottom: 40px; }
    .contact-info { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <header class="header">
      <div style="display: flex; align-items: center; z-index: 10; position: relative;">
        <img src="${esc(logoUrl)}" class="header-logo" alt="Logo" onerror="this.style.display='none'">
      </div>
      <div class="header-info">
        <div class="doc-label">${t('officialInvoice', lang)}</div>
        <h1 class="inv-no">№ ${esc(invoice.invoiceNumber)}</h1>
      </div>
      <div class="header-accent"></div>
    </header>

    <div class="content">
      <div class="dates-row">
        <div class="status-badge status-${invoice.status || 'pending'}">
          ${invoice.status === 'paid' ? t('statusPaid', lang) : invoice.status === 'unpaid' ? t('statusUnpaid', lang) : t('statusPending', lang)}
        </div>
        <div>
          <div class="date-item"><span class="date-label">${t('issueDate', lang)}:</span><span class="date-val">${dateStr(invoice.createdAt)}</span></div>
          <div class="date-item"><span class="date-label">${t('dueDate', lang)}:</span><span class="date-val">${dateStr(invoice.dueDate)}</span></div>
        </div>
      </div>

      <div class="parties">
        <div>
          <h4 class="party-title">${t('from', lang)}</h4>
          <div class="party-name">${esc(s.companyName)}</div>
          <div class="details">
            <div>• ${esc(s.address)}</div>
            <div>• ${esc(s.email)}</div>
            <div>• ${esc(s.phone)}</div>
          </div>
        </div>
        <div>
          <h4 class="party-title">${t('billTo', lang)}</h4>
          <div class="party-name">${esc(invoice.clientName || 'Mijoz')}</div>
          <div class="details">
            <div class="pj-badge">${t('project', lang)}: ${esc(project?.name || '---')}</div>
            <div style="font-weight: 800; color: #334155; margin-bottom: 2px;">${esc(invoice.company || '')}</div>
            <div>${esc(invoice.billToContact || '')}</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">#</th>
              <th>${t('serviceDesc', lang)}</th>
              <th style="text-align: center; width: 90px;">${t('start', lang)}</th>
              <th style="text-align: center; width: 60px;">${t('days', lang)}</th>
              <th style="text-align: center; width: 90px;">${t('end', lang)}</th>
              <th style="text-align: right; width: 130px;">${t('price', lang)}</th>
            </tr>
          </thead>
          <tbody>
            ${activeGroups.length === 0 ? `<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8; font-style: italic; font-weight: 700;">${t('noServices', lang)}</td></tr>` : ''}
            ${activeGroups.map(groupKey => {
    const rows = groupedRows[groupKey];
    const categoryTotal = rows.reduce((sum, r) => sum + r.price, 0);
    // Labels logic
    const headerLabel = groupKey === 'row' ? t('services', lang) : `${groupKey} ${t('services', lang)}`;
    const totalLabel = groupKey === 'row' ? t('subtotal', lang) : `${groupKey} ${t('subtotal', lang)}`;

    const rowsHtml = rows.map((row: any, idx: number) => `
                <tr class="item-row">
                  <td style="text-align: center; color: #cbd5e1; font-weight: 800;">${idx + 1}</td>
                  <td>
                    <div class="row-title">${esc(row.title)}</div>
                    ${row.subTitle ? `<div class="row-subtitle">${esc(row.subTitle)}</div>` : ''}
                  </td>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${row.startDate || '---'}</td>
                  <td style="text-align: center; font-weight: 700; color: #64748b;">${row.days || '---'}</td>
                  <td style="text-align: center; font-weight: 900; color: #2563eb;">${row.endDate || '---'}</td>
                  <td style="text-align: right; font-weight: 900; color: #0f172a;">${formatAmount(row.price, currency)}</td>
                </tr>
              `).join('');

    return `
                <tr><td colspan="6" class="cat-header">${headerLabel}</td></tr>
                ${rowsHtml}
                <tr class="cat-total-row">
                  <td colspan="5" class="cat-total-label">${totalLabel}:</td>
                  <td class="cat-total-val">${formatAmount(categoryTotal, currency)}</td>
                </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="payment-details-box">
          <div class="pay-title">${t('paymentDetails', lang)}</div>
          ${s.paymentDetailLines.map((l: any) => `
            <div class="pay-row">
              <span class="pay-key">${esc(l.title)}:</span>
              <span class="pay-val">${esc(l.value)}</span>
            </div>
          `).join('')}
          <div class="pay-note-box">${esc(s.paymentNote)}</div>
        </div>
        <div class="totals-box">
          <div class="total-line">
            <span style="font-weight: 700;">${t('totalServices', lang)}</span>
            <span style="font-weight: 900; color: #0f172a;">${formatAmount(totalAmount, currency)}</span>
          </div>
          ${Number(invoice.paidAmount || 0) > 0 ? `
          <div class="total-line" style="color: #dc2626; font-weight: 700;">
            <span>${lang === 'uz' ? "Oldindan to'lov" : lang === 'en' ? "Advance Payment" : "Аванс"}</span>
            <span>-${formatAmount(Number(invoice.paidAmount), currency)}</span>
          </div>
          ` : ''}
          ${Number(invoice.vatRate || 0) > 0 ? `
          <div class="total-line" style="color: #059669; font-weight: 700;">
            <span>QQS (${invoice.vatRate}%):</span>
            <span>+${formatAmount(totalAmount * (Number(invoice.vatRate) / 100), currency)}</span>
          </div>
          ` : ''}
          ${Number(invoice.discountRate || 0) > 0 ? `
          <div class="total-line" style="color: #d97706; font-weight: 700;">
            <span>${lang === 'uz' ? "Chegirma" : lang === 'en' ? "Discount" : "Скидка"} (${invoice.discountRate}%):</span>
            <span>-${formatAmount(totalAmount * (Number(invoice.discountRate) / 100), currency)}</span>
          </div>
          ` : ''}
          <div class="grand-total-row">
            <span class="grand-label">${t('grandTotal', lang)}</span>
            <span class="grand-value">${formatAmount(Math.max(0, totalAmount + (totalAmount * (Number(invoice.vatRate || 0) / 100)) - (totalAmount * (Number(invoice.discountRate || 0) / 100)) - Number(invoice.paidAmount || 0)), currency)}</span>
          </div>
        </div>
      </div>

      <div class="footer-auth">
        <div class="auth-seal">
          <div style="font-size: 24px; font-weight: 800; font-family: 'Outfit'; letter-spacing: 0.12em; line-height: 1;">SAYD.X</div>
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 5px; color: ${sColor} !important; border: 1px solid ${sColor}; padding: 1px 4px; border-radius: 3px; background: white;">
            ${sText}
          </div>
          <div style="font-size: 8px; font-weight: 700; margin-top: 8px; opacity: 0.8; letter-spacing: 0.02em;">${esc(invoice.invoiceNumber)}</div>
        </div>
        
        <div class="qr-code-box">
          <img src="${qrCodeDataUri}" class="qr-code-img" alt="QR Code">
          <div class="qr-help-text">${lang === 'uz' ? 'Haqiqiyligini tekshirish' : lang === 'en' ? 'Verify Authenticity' : 'Проверить подлинность'}</div>
        </div>

        <div class="signature-area">
          <img src="${esc(imzoUrl)}" class="signature-img" alt="Signature">
          <p class="signatory-name">${esc(s.authorizedName)}</p>
          <p class="signatory-pos">${esc(s.authorizedPosition)}</p>
          <div style="font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 4px;">${t('city', lang)}, ${dateStr(new Date())} ${t('yr', lang)}</div>
        </div>
      </div>
    </div>

    <footer class="legal-footer">
      <div class="contact-info">${esc(s.website)} | ${esc(s.email)} | ${esc(s.phone)}</div>
      <div style="font-size: 9px; color: #94a3b8;">&copy; ${new Date().getFullYear()} SAYD.X DIGITAL SOLUTIONS. ${t('officialMerchantDoc', lang)}.</div>
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
  baseUrl: string,
  lang: Lang = "uz"
): Promise<string> {
  ensureDir(UPLOAD_DIR);
  const timestamp = Date.now();
  const filename = `invoice-${invoice.id}-${timestamp}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Clean up old files for this invoice to prevent clutter
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    for (const f of files) {
      if (f.startsWith(`invoice-${invoice.id}-`) && f.endsWith('.pdf')) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch (e) { }
      }
    }
  } catch (e) { }

  const qrUrl = `https://saydxsystem-production.up.railway.app/verify-invoice/${invoice.verificationToken}`;
  const qrCodeDataUri = await QRCode.toDataURL(qrUrl, {
    margin: 0,
    width: 100,
    color: {
      dark: "#0f172a",
      light: "#ffffff00"
    }
  });

  const html = buildInvoiceHtml(invoice, items, project, settings, baseUrl, lang, qrCodeDataUri);

  console.log(`Generating PDF for invoice: ${invoice.invoiceNumber}...`);
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 60000,
    });
    
    // Wait for everything to settle
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));
    
    // Robust height calculation
    const bodyHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
    });
    
    const finalHeightPx = Math.max(1060, bodyHeight + 20);
    
    await page.setViewport({
      width: 794,
      height: Math.round(finalHeightPx),
      deviceScaleFactor: 2
    });

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });
  } finally {
    await browser.close();
  }

  return `/api/invoices/${invoice.id}/pdf`;
}

/** Helper to find the latest PDF for a given invoice ID in the uploads directory. */
export function getInvoicePdfPath(invoiceId: number): string | null {
  ensureDir(UPLOAD_DIR);
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    // Find files matching invoice-{id}-*.pdf
    const matches = files.filter(f => f.startsWith(`invoice-${invoiceId}-`) && f.endsWith('.pdf'));
    if (matches.length === 0) return null;

    // Sort by timestamp (the part after the last hyphen) descending
    matches.sort((a, b) => {
      const tsA = parseInt(a.split('-').pop()?.split('.')[0] || "0");
      const tsB = parseInt(b.split('-').pop()?.split('.')[0] || "0");
      return tsB - tsA;
    });

    return path.join(UPLOAD_DIR, matches[0]);
  } catch (e) {
    return null;
  }
}
