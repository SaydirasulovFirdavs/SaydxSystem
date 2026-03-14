import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";

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

function buildContractHtml(contract: any, settings: any, baseUrl: string) {
  const logoUrl = `${baseUrl}/LOGO2.png`;
  const imzoUrl = `${baseUrl}/imzo.PNG`;

  const amount = Number(contract.amount) || 0;
  const advance = Number(contract.advancePayment) || 0;
  const remaining = Number(contract.remainingAmount) || amount - advance;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 40px; font-size: 13px; }
    .header { text-align: center; margin-bottom: 40px; }
    .title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
    .contract-no { font-size: 14px; font-weight: 600; margin-bottom: 20px; }
    
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: 600; }
    
    .section-title { font-weight: 800; text-transform: uppercase; margin: 25px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    p { margin: 8px 0; text-align: justify; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; page-break-inside: avoid; }
    .party-box h4 { margin-bottom: 10px; text-transform: uppercase; color: #3b82f6; border-bottom: 1px solid #dbeafe; padding-bottom: 4px; }
    .details { font-size: 12px; color: #4b5563; }
    
    .footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
    .seal-area { position: relative; width: 150px; height: 150px; border: 3px double #000080; border-radius: 50%; display: flex; flex-direction: column; items-center: center; justify-content: center; transform: rotate(-10deg); color: #000080; font-weight: 800; text-align: center; }
    .signature-img { height: 60px; mix-blend-mode: multiply; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" style="height: 40px; margin-bottom: 15px;">
    <div class="title">HAMKORLIK SHARTNOMASI</div>
    <div class="contract-no">№ ${esc(contract.contractNumber)}</div>
  </div>

  <div class="meta-row">
    <div>Toshkent sh.</div>
    <div>${formatDate(contract.startDate)} y.</div>
  </div>

  <p>Bir tomondan, <b>"${esc(settings.companyName)}"</b> (keyingi o'rinlarda "Bajaruvchi" deb yuritiladi), o'zining Nizomi asosida ish yurituvchi rahbari ${esc(settings.authorizedName)} timsolida, va ikkinchi tomondan <b>"${esc(contract.company || contract.clientName || 'Mijoz')}"</b> (keyingi o'rinlarda "Buyurtmachi" deb yuritiladi), quyidagilar haqida ushbu shartnomani tuzdilar:</p>

  <div class="section-title">1. SHARTNOMA PREDMETI</div>
  <p>1.1. Bajaruvchi Buyurtmachining topshirig'iga binoan quyidagi xizmatlarni ko'rsatish majburiyatini oladi: <b>${esc(contract.description || 'Loyiha ishlab chiqish')}</b>.</p>
  <p>1.2. Buyurtmachi Bajaruvchi tomonidan ko'rsatilgan xizmatlarni qabul qilish va ushbu shartnomada belgilangan tartibda to'lovni amalga oshirish majburiyatini oladi.</p>

  <div class="section-title">2. SHARTNOMA SUMMASI VA TO'LOV TARTIBI</div>
  <p>2.1. Ushbu shartnomaning umumiy qiymati <b>${formatAmount(amount, contract.currency)}</b> loyini tashkil etadi.</p>
  <p>2.2. Buyurtmachi shartnoma imzolangan kundan boshlab 3 bank ish kuni ichida umumiy summaning 50 foizi miqdorida, ya'ni <b>${formatAmount(advance, contract.currency)}</b> miqdorida avans to'lovini amalga oshiradi.</p>
  <p>2.3. Qolgan 50 foiz to'lov, ya'ni <b>${formatAmount(remaining, contract.currency)}</b> ishlar to'liq topshirilib, qabul qilish-topshirish dalolatnomasi imzolanganidan so'ng 3 bank ish kuni ichida to'lanadi.</p>

  <div class="section-title">3. TOMONLARNING MAJBURIYATLARI</div>
  <p>3.1. Bajaruvchi xizmatlarni sifatli va belgilangan muddatlarda (<b>${formatDate(contract.endDate)}</b> gacha) bajarishi shart.</p>
  <p>3.2. Buyurtmachi Bajaruvchiga xizmat ko'rsatish uchun zarur bo'lgan barcha ma'lumotlarni o'z vaqtida taqdim etishi shart.</p>

  <div class="section-title">4. YAKUNIY QOIDALAR</div>
  <p>4.1. Ushbu shartnoma tomonlar imzolagan kundan boshlab kuchga kiradi va majburiyatlar to'liq bajarilgunga qadar amalda bo'ladi.</p>
  <p>4.2. Shartnoma ikki nusxada tuzilgan bo'lib, har bir nusxa bir xil yuridik kuchga ega.</p>

  <div class="parties-grid">
    <div class="party-box">
      <h4>BAJARUVCHI</h4>
      <div class="details">
        <b>${esc(settings.companyName)}</b><br>
        Manzil: ${esc(settings.address)}<br>
        Tel: ${esc(settings.phone)}<br>
        H/r: ${esc(settings.accountNumber)}<br>
        Bank: ${esc(settings.bankName)}<br>
      </div>
    </div>
    <div class="party-box">
      <h4>BUYURTMACHI</h4>
      <div class="details">
        <b>${esc(contract.company || contract.clientName)}</b><br>
        Mijoz: ${esc(contract.clientName)}<br>
        To'lov turi: ${esc(contract.paymentType || "O'tkazma")}<br>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="seal-area">
      <div style="font-size: 20px;">SAYD.X</div>
      <div style="font-size: 9px; border: 1px solid #000080; padding: 2px;">SHARTNOMA UCHUN</div>
    </div>
    <div style="text-align: right;">
      <img src="${imzoUrl}" class="signature-img">
      <div style="font-weight: 800;">${esc(settings.authorizedName)}</div>
      <div style="font-size: 10px; color: #666;">${esc(settings.authorizedPosition)}</div>
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

  const html = buildContractHtml(contract, settings, baseUrl);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" }
    });
  } finally {
    await browser.close();
  }

  return `/api/contracts/${contract.id}/pdf`;
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
