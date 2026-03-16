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
    @page {
      margin: 10mm;
      size: A4;
    }
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
      page-break-after: always;
      min-height: 1000px;
      box-sizing: border-box;
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
    
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 15px; }
    .header img { height: 45px; margin-bottom: 8px; }
    .title { font-size: 16pt; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
    .contract-no { font-size: 12pt; font-weight: 600; margin-top: 5px; color: #666; }
    
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: 600; font-size: 10pt; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    
    .section { margin-bottom: 15px; }
    .section-title { 
      font-weight: 800; 
      text-transform: uppercase; 
      margin: 15px 0 8px 0; 
      color: #312e81;
      font-size: 10.5pt;
      display: flex;
      align-items: center;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 14px;
      background: #6366f1;
      margin-right: 8px;
      border-radius: 2px;
    }
    
    p { margin: 6px 0; text-align: justify; }
    
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 25px; page-break-inside: avoid; border-top: 1px solid #eee; padding-top: 15px; }
    .party-box h4 { margin-bottom: 8px; text-transform: uppercase; color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; font-weight: 800; }
    .details { font-size: 9pt; color: #374151; line-height: 1.4; }
    
    .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid; }
    .seal-area { position: relative; width: 120px; height: 120px; border: 4px double #4338ca; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); color: #4338ca; font-weight: 800; text-align: center; background: rgba(99, 102, 241, 0.02); }
    .signature-container { text-align: right; min-width: 200px; }
    .signature-img { height: 60px; mix-blend-mode: multiply; margin-bottom: -15px; position: relative; z-index: 10; padding-right: 20px; }
    .sign-line { border-bottom: 1px solid #333; width: 100%; margin: 5px 0; }
    
    .verified-badge {
      position: absolute;
      top: 40px;
      right: 60px;
      border: 2px solid #10b981;
      color: #10b981;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7pt;
      transform: rotate(5deg);
    }
    
    b { color: #000; }
    ul { margin: 10px 0 15px 20px; padding: 0; list-style-type: disc; }
    li { margin-bottom: 5px; text-align: justify; }

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

    <div class="section">
      <p>"SAYD.X" yakka tartibdagi tadbirkor, <b>ATAULLAYEV SAIDMUHAMMADALIXON UMID O'G'LI</b> – mazkur kompaniya asoschisi va rahbari, (keyingi o‘rinlarda matnda “Kompaniya” deb yuritiladi) o‘z Nizomi asosida faoliyat yurituvchi, O‘zbekiston Respublikasi qonunchiligiga muvofiq ro‘yxatdan o‘tgan va web-saytlar, Telegram botlar hamda avtomatlashtirilgan (AyTi) tizimlar sohasida xizmat ko‘rsatib kelayotgan tashkilot sifatida, mazkur shartnoma orqali o‘z xizmatlarini buyurtmachi (keyingi o‘rinlarda matnda “Mijoz” deb yuritiladi)ga taqdim etishni taklif qiladi. Ushbu shartnoma O‘zbekiston Respublikasi Fuqarolik kodeksining 367-moddasiga muvofiq, tomonlarning o‘zaro kelishuvi asosida tuzilgan bo‘lib, “Kompaniya” va “Mijoz” birgalikda “Tomonlar” deb yuritiladi. Mazkur shartnoma taklifi, Mijoz tomonidan “Kompaniya”ning rasmiy aloqa manzili bo‘lmish Telegram kanali @saydxuz orqali buyurtma berish, shuningdek shartnomada ko‘rsatilgan to‘lov tartib-qoidalarini amalga oshirish orqali tuzilgan hisoblanadi va shu kundan e’tiboran yuridik kuchga ega bo‘ladi. Tomonlar bundan buyon matnda “Mijoz” va “Kompaniya” deb yuritiladi.</p>
    </div>

    <div class="section-title">2. Shartnoma predmeti</div>
    <div class="section">
      <p>2.1. Kompaniya Mijozga quyidagi xizmatlarni taqdim etadi: <b>${esc(contract.description || 'Loyiha ishlab chiqish')}</b>.</p>
      <ul>
        <li>Telegram botlar ishlab chiqish – buyurtmalar qabul qilish, to‘lovlarni amalga oshirish va jarayonlarni avtomatlashtirish imkoniyatiga ega botlar yaratish.</li>
        <li>Web-saytlar yaratish – zamonaviy texnologiyalar asosida korporativ va tijorat saytlarini ishlab chiqish.</li>
        <li>Moliyaviy xizmatlarni tizimlashtirish (Google Sheets orqali) – daromad va xarajatlarni hisoblash, balans yuritish va moliyaviy nazorat tizimlarini yaratish va yana barcha ma’lumotlar bazzasini boshqarish tizimini google sheetsga ulab berish.</li>
        <li>UI/UX dizayn – foydalanuvchilarga qulay interfeys va samarali tajriba taqdim etuvchi dizaynlar ishlab chiqish.</li>
        <li>Mini-ilovalar yaratish – biznes jarayonlarini soddalashtiruvchi kichik dasturlar tayyorlash.</li>
        <li>Target reklama (Telegram orqali) – mahsulot va xizmatlarni targ‘ib qilish uchun maqsadli auditoriyaga reklama yo‘lga qo‘yish.</li>
        <li>Jarayonlarni avtomatlashtirish – qo‘lda va qog‘ozda bajariladigan ishlarni IT vositalari yordamida avtomatlashtirish.</li>
        <li>To‘lov tizimlari va SMS xizmatlari integratsiyasi – Click, Payme va boshqa tizimlar bilan ulash.</li>
        <li>CRM va tashqi tizimlar integratsiyasi – turli tizimlar miqyosida yagona platformaga birlashtirish.</li>
        <li>Qo‘shimcha zamonaviy xizmatlar – Mijoz ehtiyojidan kelib chiqib yangi IT yechimlarini joriy etish.</li>
      </ul>
      <p>2.2. Xizmatlar hajmi, texnik topshiriq (TZ) va muddatlar qo‘shimcha kelishuv (OFFER) orqali belgilanadi.</p>
    </div>

    <div class="section-title">3. Tomonlarning huquq va majburiyatlari</div>
    <div class="section">
      <p>3.1. Kompaniya majburiyatlari: Xizmatlarni sifatli va belgilangan muddatlarda bajarish; Mijozga 24/7 texnik yordam ko‘rsatish; Taqdim etilgan barcha axborot va hujjatlarni sir saqlash; Innovatsion va xavfsiz texnologiyalarni qo‘llash.</p>
      <p>3.2. Kompaniya huquqlari: Texnik topshiriqni aniq bajarish uchun qo‘shimcha ma’lumot so‘rash; Mijoz o‘z vaqtida to‘lovni amalga oshirmagan taqdirda xizmatni vaqtincha to‘xtatish.</p>
      <p>3.3. Mijoz majburiyatlari: Xizmatlarni o‘z vaqtida qabul qilib olish; Belgilangan muddatlarda to‘lovni amalga oshirish; Loyiha uchun zarur barcha hujjatlar va ma’lumotlarni taqdim etish.</p>
    </div>

    <div class="section-title">4. Moliyaviy shartlar va to‘lov tartibi</div>
    <div class="section">
      <p>4.1. Xizmat narxi, buyurtma muddati va to‘lov rekvizitlari OFFERda ko‘rsatilgan tartibda belgilanadi. Umumiy qiymat: <b>${formatAmount(amount, contract.currency || 'UZS')}</b>.</p>
      <p>4.2. Shartnoma kuchga kirishi uchun belgilangan xizmat narxidan 50% miqdorda (<b>${formatAmount(advance, contract.currency || 'UZS')}</b>) oldindan to‘lov amalga oshirilishi shart.</p>
      <p>4.7. Yakuniy natija topshirilganidan so‘ng, qolgan 50% (<b>${formatAmount(remaining, contract.currency || 'UZS')}</b>) amalga oshiriladi.</p>
    </div>

    <div class="section-title">5. Javobgarlik</div>
    <div class="section">
      <p>5.1. Tomonlar shartnoma shartlarini bajarmagan taqdirda O'zbekiston Respublikasi amaldagi qonunchiligiga muvofiq javobgar bo'ladilar.</p>
      <p>5.2. Kompaniya uchinchi tomon dasturlari (API, Payme, Click, Telegram, Server, Hosting, Google sheets va h.k.) nosozliklari uchun javobgar emas.</p>
    </div>

    <div class="section-title">6. Fors-major holatlar</div>
    <div class="section">
      <p>6.1. Tomonlarning nazoratidan tashqarida bo'lgan tabiiy ofatlar va texnologik nosozliklar vaqtida tomonlar javobgar bo'lmaydi.</p>
    </div>

    <div class="section-title">7. Amal qilish muddati va bekor qilish</div>
    <div class="section">
      <p>7.1. Shartnoma tomonlar imzo qo'ygan kundan boshlab kuchga kiradi va loyiha muddati (<b>${formatDate(contract.endDate)}</b> gacha) amal qiladi.</p>
    </div>

    <div class="section-title">8. Yakuniy qoidalar</div>
    <div class="section">
      <p>8.1. O'zgartirish va qo'shimchalar faqat ikki tomonning yozma kelishuvi asosida amalga oshiriladi.</p>
    </div>

    <div class="section-title">9. Tomonlarning rekvizitlari</div>
    <div class="parties-grid" style="margin-top: 10px;">
      <div class="party-box">
        <h4>KOMPANIYA</h4>
        <div class="details">
          <b>"SAYD.X" YATT</b><br>
          Manzil: Toshkent sh., Yashnobod tum., Obod makon 56/12 uy<br>
          Tel: +998 20 000 37 90<br>
          H/r: 20218000207298668001<br>
          Bank: TBC BANK (MFO: 00444, STIR: 637742163)
        </div>
      </div>
      <div class="party-box">
        <h4>BUYURTMACHI</h4>
        <div class="details">
          <b>${esc(contract.company || contract.clientName)}</b><br>
          Vakil: ${esc(contract.clientName)}<br>
          Manzil: ${esc(contract.clientAddress || '---')}<br>
          Tel: ${esc(contract.clientPhone || '---')}<br>
          To'lov turi: ${esc(contract.paymentType || "Card")}
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
        <div style="font-weight: 800; color: #4338ca;">SAIDMUHAMMADALIXON UMID O'G'LI</div>
        <div style="font-size: 8pt; color: #666; margin-bottom: 4px;">Kompaniya rahbari</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: OFFER -->
  <div class="page" style="display: flex; flex-direction: column;">
    <div class="offer-header">
      <div class="offer-logo-section">
        <img src="${logoUrl}">
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
      <tr>
        <td>Click to'lovi uchun</td>
        <td>
          ${(() => {
            const details = contract.clickDetails || "";
            // Regex to match card number (digits and spaces) and the following name
            const match = details.match(/^([\d\s]+)\s+([A-Za-z\s.'`‘’‘]+)$/);
            if (match) {
              return `<b>${esc(match[1].trim())}</b><br><span style="font-size: 0.85em; color: #4b5563;">${esc(match[2].trim())}</span>`;
            }
            return esc(details || "---");
          })()}
        </td>
      </tr>
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
