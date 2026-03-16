import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "contracts");

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function esc(val: any) {
  const str = String(val || "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(d: Date | string | null) {
  if (!d) return "---";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, ".");
}

function formatAmount(amt: string | number, currency: string) {
  const n = typeof amt === "string" ? Number(amt) : amt;
  return new Intl.NumberFormat("uz-UZ").format(n) + " " + currency;
}

function getSettings(s: any) {
  const defaults = {
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
  if (!s) return defaults;
  return {
    companyName: s.companyName ?? defaults.companyName,
    address: s.address ?? defaults.address,
    phone: s.phone ?? defaults.phone,
    email: s.email ?? defaults.email,
    website: s.website ?? defaults.website,
    bankName: s.bankName ?? defaults.bankName,
    accountNumber: s.accountNumber ?? defaults.accountNumber,
    paymentNote: s.paymentNote ?? defaults.paymentNote,
    authorizedName: s.authorizedName ?? defaults.authorizedName,
    authorizedPosition: s.authorizedPosition ?? defaults.authorizedPosition,
  };
}

function buildContractHtml(contract: any, rawSettings: any, baseUrl: string, qrCodeDataUri: string) {
  const settings = getSettings(rawSettings);
  const logoUrl = `${baseUrl}/LOGO2.png`;
  const imzoUrl = `${baseUrl}/imzo.PNG`;

  const amount = Number(contract.amount) || 0;
  const advance = Number(contract.advancePayment) || 0;
  const remaining = Number(contract.remainingAmount) || amount - advance;

  const splitToList = (text: string) => {
    if (!text) return [];
    return text.split(/[,\n]/).map(item => item.trim()).filter(item => item.length > 0);
  };

  const services = splitToList(contract.proposedServices || "Sayt yaratish, Bot integratsiyasi");
  const advantages = splitToList(contract.advantages || "Tezkor, Sifatli, 24/7 yordam");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Inter', sans-serif; 
      line-height: 1.4; 
      color: #1a1a1a; 
      margin: 0; 
      padding: 0; 
      font-size: 11pt; 
    }
    .page {
      padding: 50px 70px;
      position: relative;
      min-height: 1000px;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    
    /* Watermark */
    .watermark::before {
      content: 'SAYD.X OFFICIAL';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      color: rgba(99, 102, 241, 0.05);
      font-weight: 900;
      white-space: nowrap;
      pointer-events: none;
      z-index: -1;
    }
    
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
    .header img { height: 45px; margin-bottom: 10px; }
    .title { font-size: 16pt; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
    .contract-no { font-size: 12pt; font-weight: 600; margin-top: 5px; color: #666; }
    
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 25px; font-weight: 600; font-size: 10pt; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    
    .section { margin-bottom: 15px; }
    .section-title { 
      font-weight: 800; 
      text-transform: uppercase; 
      margin: 15px 0 8px 0; 
      color: #312e81;
      font-size: 11pt;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: #6366f1;
      margin-right: 10px;
      border-radius: 2px;
    }
    
    p { margin: 6px 0; text-align: justify; text-indent: 0; }
    .indent { padding-left: 20px; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; page-break-inside: avoid; border-top: 1px solid #eee; padding-top: 20px; }
    .party-box h4 { margin-bottom: 8px; text-transform: uppercase; color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; font-weight: 800; }
    .details { font-size: 9pt; color: #374151; line-height: 1.6; }
    
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid; }
    .seal-area { position: relative; width: 140px; height: 140px; border: 4px double #4338ca; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); color: #4338ca; font-weight: 800; text-align: center; background: rgba(99, 102, 241, 0.02); }
    .signature-container { text-align: right; min-width: 200px; }
    .signature-img { height: 70px; mix-blend-mode: multiply; margin-bottom: -15px; position: relative; z-index: 10; padding-right: 20px; }
    .sign-line { border-bottom: 1px solid #333; width: 100%; margin-top: 5px; margin-bottom: 5px; }
    
    .verified-badge {
      position: absolute;
      top: 50px;
      right: 70px;
      border: 2px solid #10b981;
      color: #10b981;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8pt;
      transform: rotate(5deg);
    }
    
    b { color: #000; }
    ul { margin: 5px 0 5px 20px; padding: 0; }
    li { margin-bottom: 3px; }

    /* Offer Styles */
    .offer-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .offer-logo-section { display: flex; flex-direction: column; gap: 5px; }
    .offer-logo-section img { height: 40px; width: fit-content; }
    .offer-logo-section .brand { font-size: 24pt; font-weight: 900; color: #1e1b4b; letter-spacing: -1px; }
    .offer-label-section { text-align: right; }
    .offer-label { font-size: 40pt; font-weight: 900; color: rgba(99, 102, 241, 0.1); text-transform: uppercase; letter-spacing: -2px; line-height: 1; }
    .offer-date { font-size: 10pt; font-weight: 700; color: #94a3b8; margin-top: 5px; }

    .offer-client { margin-bottom: 30px; }
    .offer-client-label { font-size: 9pt; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
    .offer-client-name { font-size: 22pt; font-weight: 900; color: #1a1a1a; text-transform: uppercase; letter-spacing: -0.5px; }

    .offer-intro { 
      background: #f5f3ff; 
      padding: 20px; 
      border-radius: 12px; 
      border-left: 4px solid #6366f1; 
      margin-bottom: 30px; 
      font-size: 10pt; 
      font-style: italic; 
      text-align: justify; 
      color: #4b5563;
    }

    .offer-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 9pt; }
    .offer-table tr { border-bottom: 1px solid #f1f5f9; }
    .offer-table td { padding: 8px 0; }
    .offer-table td:first-child { width: 35%; font-weight: 800; color: rgba(30, 27, 75, 0.4); text-transform: uppercase; letter-spacing: -0.5px; }
    .offer-table td:last-child { width: 65%; font-weight: 700; color: #1f2937; }

    .offer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .offer-list-title { font-size: 10pt; font-weight: 900; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .offer-list-title::before { content: ''; width: 8px; height: 8px; background: #6366f1; border-radius: 50%; }
    .offer-list-item { font-size: 9pt; font-weight: 700; color: #4b5563; margin-bottom: 6px; display: flex; gap: 8px; }
    .offer-list-item .bullet { color: #818cf8; }
    .offer-list-item .check { width: 14px; height: 14px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6366f1; }

    .offer-footer { margin-top: auto; padding-top: 30px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .offer-footer-text { font-size: 8pt; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 5px; }
    .offer-footer-link { font-size: 8pt; font-weight: 700; color: #818cf8; }
  </style>
</head>
<body>
  <div class="page watermark">
    <div class="verified-badge">VERIFIED BY SAYD.X</div>
    
    <div class="header">
      <img src="${logoUrl}">
      <div class="title">SAYD.X KOMPANIYASI HAMKORLIK SHARTNOMASI</div>
      <div class="contract-no">№ ${esc(contract.contractNumber)}</div>
    </div>

    <div class="meta-row">
      <div>Sana: ${formatDate(contract.startDate)} yil</div>
      <div style="text-align: right;">
        <div style="font-size: 8px; color: #666; margin-bottom: 2px;">TEKSHIRISH UCHUN SKANERLANG</div>
        <img src="${qrCodeDataUri}" style="width: 60px; height: 60px; border: 1px solid #eee; padding: 2px; border-radius: 4px;">
      </div>
    </div>

    <div style="margin-bottom: 30px; padding: 15px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #4338ca;">
      <div style="font-size: 8pt; font-weight: 800; color: #6366f1; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">MIJOZ MA'LUMOTLARI</div>
      <div style="font-size: 14pt; font-weight: 800; color: #1e1b4b; line-height: 1.2;">${esc(contract.company || contract.clientName)}</div>
      <div style="font-size: 10pt; color: #4338ca; font-weight: 600; margin-top: 4px;">${esc(contract.clientName)}</div>
    </div>

    <div class="section">
      <p>"SAYD.X" jamoasi, <b>ATAULLAYEV SAIDMUHAMMADALIXON UMID O'G'LI</b> – mazkur jamoa asoschisi va rahbari, (keyingi o'rinlarda matnda "Kompaniya" deb yuritiladi), ikkinchi tomondan <b style="text-transform: uppercase;">"${esc(contract.company || contract.clientName)}"</b> (keyingi o'rinlarda "Buyurtmachi" deb yuritiladi), o'rtasida quyidagilar haqida ushbu shartnoma tuzildi:</p>
    </div>

    <div class="section-title">1. SHARTNOMA PREDMETI</div>
    <div class="section">
      <p>1.1. Bajaruvchi Buyurtmachining topshirig'iga binoan quyidagi xizmatlarni ko'rsatish majburiyatini oladi: <b>${esc(contract.description || 'Loyiha ishlab chiqish')}</b>.</p>
      <p>1.2. Buyurtmachi Bajaruvchi tomonidan ko'rsatilgan xizmatlarni qabul qilish va ushbu shartnomada belgilangan tartibda to'lovni amalga oshirish majburiyatini oladi.</p>
    </div>

    <div class="section-title">2. SHARTNOMA SUMMASI VA TO'LOV TARTIBI</div>
    <div class="section">
      <p>2.1. Ushbu shartnomaning umumiy qiymati <b>${formatAmount(amount, contract.currency || 'UZS')}</b> loyini tashkil etadi.</p>
      <p>2.2. Buyurtmachi shartnoma imzolangan kundan boshlab 3 bank ish kuni ichida umumiy summaning 50 foizi miqdorida, ya'ni <b>${formatAmount(advance, contract.currency || 'UZS')}</b> miqdorida avans to'lovini amalga oshiradi.</p>
      <p>2.3. Qolgan 50 foiz to'lov, ya'ni <b>${formatAmount(remaining, contract.currency || 'UZS')}</b> ishlar to'liq topshirilib, qabul qilish-topshirish dalolatnomasi imzolanganidan so'ng 3 bank ish kuni ichida to'lanadi.</p>
    </div>

    <div class="section-title">3. TOMONLARNING MAJBURIYATLARI</div>
    <div class="section">
      <p>3.1. Bajaruvchi xizmatlarni sifatli va belgilangan muddatlarda (<b>${formatDate(contract.endDate)}</b> gacha) bajarishi shart.</p>
      <p>3.2. Buyurtmachi Bajaruvchiga xizmat ko'rsatish uchun zarur bo'lgan barcha ma'lumotlarni o'z vaqtida taqdim etishi shart.</p>
      <p style="font-size: 8pt; font-style: italic; color: #666; margin-top: 10px;">* Batafsil shartlar va ish rejasi ilova qilingan OFFER hujjatida ko'rsatilgan.</p>
    </div>

    <div class="parties-grid">
      <div class="party-box">
        <h4>KOMPANIYA</h4>
        <div class="details">
          <b>${esc(settings.companyName || '"SAYD.X" LLC')}</b><br>
          Manzil: ${esc(settings.address)}<br>
          Tel: ${esc(settings.phone)}<br>
          H/r: ${esc(settings.accountNumber)}<br>
          Bank: ${esc(settings.bankName)}
        </div>
      </div>
      <div class="party-box">
        <h4>BUYURTMACHI</h4>
        <div class="details">
          <b>${esc(contract.company || contract.clientName)}</b><br>
          Vakil: ${esc(contract.clientName)}<br>
          Manzil: ${esc(contract.clientAddress || '---')}<br>
          Tel: ${esc(contract.clientPhone || '---')}<br>
          To'lov turi: ${esc(contract.paymentType || "O'tkazma")}
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="seal-area">
        <div style="font-size: 18px; letter-spacing: 2px;">SAYD.X</div>
        <div style="font-size: 7px; border: 1px solid #4338ca; padding: 1px 4px; margin-top: 5px;">OFFICIAL DOCUMENT</div>
        <div style="font-size: 6px; margin-top: 5px;">${esc(contract.verificationToken || 'PENDING')}</div>
      </div>
      <div class="signature-container">
        <img src="${imzoUrl}" class="signature-img">
        <div class="sign-line"></div>
        <div style="font-weight: 800; color: #4338ca;">${esc(settings.authorizedName)}</div>
        <div style="font-size: 8pt; color: #666; margin-bottom: 4px;">${esc(settings.authorizedPosition)}</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: OFFER -->
  <div class="page" style="display: flex; flex-direction: column;">
    <div class="offer-header">
      <div class="offer-logo-section">
        <img src="${logoUrl}">
        <div class="brand">SAYD.X</div>
      </div>
      <div class="offer-label-section">
        <div class="offer-label">OFFER</div>
        <div class="offer-date">Sana: ${formatDate(contract.startDate)} yil</div>
      </div>
    </div>

    <div class="offer-client">
      <div class="offer-client-label">HURMATLI:</div>
      <div class="offer-client-name">${esc(contract.company || contract.clientName || "MIJOZ")}</div>
    </div>

    <div class="offer-intro">
      Biz, "SAYD.X" jamoasi sizning biznesingizni yangi bosqichga olib chiqish, jarayonlarni avtomatlashtirish va raqamli texnologiyalar imkoniyatlaridan maksimal darajada foydalanishni taklif etamiz. Ushbu hujjat sizga taqdim etilayotgan barcha xizmatlar va hamkorlik shartlarini o'z ichiga oladi.
    </div>

    <table class="offer-table">
      <tr><td>Korxona nomi</td><td>${esc(contract.company || contract.clientName)}</td></tr>
      <tr><td>Bizning manzilimiz</td><td>${esc(settings.address || "Toshkent sh.")}</td></tr>
      <tr><td>Shartnoma muddati</td><td>${formatDate(contract.startDate)} — ${formatDate(contract.endDate)}</td></tr>
      <tr><td>Ish grafigi</td><td>${esc(contract.workSchedule || "Dushanba - Shanba, 10:00 - 19:00")}</td></tr>
      <tr><td>To'lov summasi</td><td>${formatAmount(amount, contract.currency || 'UZS')}</td></tr>
      <tr><td>Oldindan to'lov</td><td>${formatAmount(advance, contract.currency || 'UZS')}</td></tr>
      <tr><td>Qolgan qismi</td><td>${formatAmount(remaining, contract.currency || 'UZS')}</td></tr>
      <tr><td>Loyixa tavsifi</td><td>${esc(contract.description || "---")}</td></tr>
      <tr><td>Biriktirilgan menedjer</td><td>${esc(settings.authorizedName || "---")}</td></tr>
      <tr><td>Menedjer telfoni</td><td>${esc(contract.managerPhone || settings.phone || "---")}</td></tr>
      <tr><td>Ish tartibi</td><td>${esc((contract.workMethod || "Offline").toUpperCase())}</td></tr>
      <tr><td>To'lov turi</td><td>${esc((contract.paymentType || "Card").toUpperCase())}</td></tr>
      <tr><td>Click to'lovi uchun</td><td>${esc(contract.clickDetails || "---")}</td></tr>
      <tr><td>Muammoli bog'lanish</td><td>${esc(contract.issueContact || settings.phone || "---")}</td></tr>
      <tr><td>Ketadigan vaqt</td><td>${esc(contract.projectDurationInfo || "---")}</td></tr>
    </table>

    <div class="offer-grid">
      <div>
        <div class="offer-list-title">TAKLIF QILINAYOTGAN XIZMATLAR</div>
        ${services.map(s => `
          <div class="offer-list-item"><span class="bullet">•</span> ${esc(s)}</div>
        `).join('')}
      </div>
      <div>
        <div class="offer-list-title">XIZMATNING AFZALLIKLARI</div>
        ${advantages.map(a => `
          <div class="offer-list-item">
            <div class="check">✓</div>
            ${esc(a)}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="offer-footer">
      <div class="offer-footer-text">SAYD.X PROFESSIONAL SERVICES</div>
      <div class="offer-footer-link">www.saydx.uz</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateContractPdfPuppeteer(contract: any, settings: any, baseUrl: string): Promise<string> {
  ensureDir(UPLOAD_DIR);
  const timestamp = Date.now();
  const filename = `contract-${contract.id}-${timestamp}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const qrCodeUrl = `${baseUrl}/verify-contract?token=${contract.verificationToken}`;
  const qrCodeDataUri = await QRCode.toDataURL(qrCodeUrl, {
    margin: 1,
    width: 200,
    color: {
      dark: "#312e81",
      light: "#ffffff"
    }
  });

  console.log(`Generating PDF for contract: ${contract.contractNumber}...`);
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
    const html = buildContractHtml(contract, settings, baseUrl, qrCodeDataUri);
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    
    ensureDir(UPLOAD_DIR);
    // Use consistent naming: contract-{id}-{timestamp}.pdf
    const finalFilePath = path.join(UPLOAD_DIR, filename);
    
    await page.pdf({
      path: finalFilePath,
      format: "A4",
      printBackground: true,
    });
    
    console.log(`Contract PDF generated: ${finalFilePath}`);
    return `/api/contracts/${contract.id}/pdf`;
  } catch (error) {
    console.error("Puppeteer PDF generation error:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

export function getContractPdfPath(contractId: number): string | null {
  ensureDir(UPLOAD_DIR);
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const matches = files.filter(f => f.startsWith(`contract-${contractId}-`) && f.endsWith('.pdf'));
    if (matches.length === 0) return null;
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
