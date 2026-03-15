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

function buildContractHtml(contract: any, settings: any, baseUrl: string, qrCodeDataUri: string) {
  const logoUrl = `${baseUrl}/LOGO2.png`;
  const imzoUrl = `${baseUrl}/imzo.PNG`;

  const amount = Number(contract.amount) || 0;
  const advance = Number(contract.advancePayment) || 0;
  const remaining = Number(contract.remainingAmount) || amount - advance;

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
      padding: 50px 70px; 
      font-size: 11pt; 
      position: relative;
    }
    /* Watermark */
    body::before {
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
  </style>
</head>
<body>
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
    <p>"SAYD.X" yakka tartibdagi tadbirkor, <b>ATAULLAYEV SAIDMUHAMMADALIXON UMID O'G'LI</b> – mazkur kompaniya asoschisi va rahbari, (keyingi o'rinlarda matnda "Kompaniya" deb yuritiladi) o'z Nizomi asosida faoliyat yurituvchi, O'zbekiston Respublikasi qonunchiligiga muvofiq ro'yxatdan o'tgan va web-saytlar, Telegram botlar hamda avtomatlashtirilgan (AyTi) tizimlar sohasida xizmat ko'rsatib kelayotgan tashkilot sifatida, mazkur shartnoma orqali o'z xizmatlarini buyurtmachi (keyingi o'rinlarda matnda "Mijoz" deb yuritiladi)ga taqdim etishni taklif qiladi. Ushbu shartnoma O'zbekiston Respublikasi Fuqarolik kodeksining 367-moddasiga muvofiq, tomonlarning o'zaro kelishuvi asosida tuzilgan bo'lib, "Kompaniya" va "Mijoz" birgalikda "Tomonlar" deb yuritiladi. Mazkur shartnoma taklifi, Mijoz tomonidan "Kompaniya"ning rasmiy aloqa manzili bo'lmish Telegram kanali @saydxuz orqali buyurtma berish, shuningdek shartnomada ko'rsatilgan to'lov tartib-qoidalarini amalga oshirish orqali tuzilgan hisoblanadi va shu kundan e'tiboran yuridik kuchga ega bo'ladi. Tomonlar bundan buyon matnda "Mijoz" va "Kompaniya" deb yuritiladi.</p>
  </div>

  <div class="section-title">2. SHARTNOMA PREDMETI</div>
  <div class="section">
    <p>2.1. Kompaniya Mijozga quyidagi xizmatlarni taqdim etadi:</p>
    <ul>
      <li><b>Telegram botlar ishlab chiqish</b> – buyurtmalar qabul qilish, to'lovlarni amalga oshirish va jarayonlarni avtomatlashtirish imkoniyatiga ega botlar yaratish.</li>
      <li><b>Web-saytlar yaratish</b> – zamonaviy texnologiyalar asosida korporativ va tijorat saytlarini ishlab chiqish.</li>
      <li><b>Moliyaviy xizmatlarni tizimlashtirish</b> (Google Sheets orqali) – daromad va xarajatlarni hisoblash, balans yuritish va moliyaviy nazorat tizimlarini yaratish va yana barcha ma'lumotlar bazzasini boshqarish tizimini google sheetsga ulab berish.</li>
      <li><b>UI/UX dizayn</b> – foydalanuvchilarga qulay interfeys va samarali tajriba taqdim etuvchi dizaynlar ishlab chiqish.</li>
      <li><b>Mini-ilovalar yaratish</b> – biznes jarayonlarini soddalashtiruvchi kichik dasturlar tayyorlash.</li>
      <li><b>Target reklama</b> (Telegram orqali) – mahsulot va xizmatlarni targ'ib qilish uchun maqsadli auditoriyaga reklama yo'lga qo'yish.</li>
      <li><b>Jarayonlarni avtomatlashtirish</b> – qo'lda va qog'ozda bajariladigan ishlarni IT vositalari yordamida avtomatlashtirish.</li>
      <li><b>To'lov tizimlari va SMS xizmatlari integratsiyasi</b> – Click, Payme va boshqa tizimlar bilan ulash.</li>
      <li><b>CRM va tashqi tizimlar integratsiyasi</b> – turli tizimlarni yagona platformaga birlashtirish.</li>
      <li><b>Qo'shimcha zamonaviy xizmatlar</b> – Mijoz ehtiyojidan kelib chiqib yangi IT yechimlarini joriy etish.</li>
    </ul>
    <p>Asosiy loyiha tavsifi: <b>${esc(contract.description || 'Loyiha ishlab chiqish')}</b></p>
    <p>2.2. Xizmatlar hajmi, texnik topshiriq (TZ) va muddatlar qo'shimcha kelishuv (OFFER) orqali belgilanadi.</p>
    <p class="indent">- OFFER hujjatida xizmatlarning to'liq tavsifi, ularning funksional imkoniyatlari, bajarilish bosqichlari, yakuniy natija talablari va ko'rsatkichlari aniq bayon qilingan.</p>
    <p class="indent">- Qo'shimcha kelishuv (OFFER) tomonlar tomonidan tasdiqlangan kundan boshlab yuridik kuchga ega bo'ladi va ushbu shartnomaga teng huquqli hujjat sifatida qo'llaniladi.</p>
  </div>

  <div class="section-title">3. TOMONLARNING HUQUQ VA MAJBURIYATLARI</div>
  <div class="section">
    <p>3.1. Kompaniya majburiyatlari: Xizmatlarni sifatli va belgilangan muddatlarda bajarish; Mijozga 24/7 texnik yordam ko'rsatish; Taqdim etilgan barcha axborot va hujjatlarni sir saqlash; Innovatsion va xavfsiz texnologiyalarni qo'llash.</p>
    <p>3.2. Kompaniya huquqlari: Texnik topshiriqni aniq bajarish uchun qo'shimcha ma'lumot so'rash; Mijoz o'z vaqtida to'lovni amalga oshirmagan taqdirda xizmatni vaqtincha to'xtatish.</p>
    <p>3.3. Mijoz majburiyatlari: Xizmatlarni o'z vaqtida qabul qilib olish; Belgilangan muddatlarda to'lovni amalga oshirish; Loyiha uchun zarur barcha hujjatlar va ma'lumotlarni taqdim etish.</p>
    <p>3.4. Mijoz huquqlari: Xizmat jarayonini nazorat qilish; Qo'shimcha xizmatlar buyurtma qilish; Shartnoma shartlarini buzilish hollari yuz bersa, kompensatsiya talab qilish.</p>
  </div>

  <div class="section-title">4. MOLIYAVIY SHARTLAR VA TO'LOV TARTIBI</div>
  <div class="section">
    <p>4.1. Xizmat narxi, buyurtma muddati va to'lov rekvizitlari OFFERda ko'rsatilgan tartibda belgilanadi.</p>
    <p>4.2. Shartnoma kuchga kirishi uchun belgilangan xizmat narxidan 50% miqdorda, ya'ni <b>${formatAmount(advance, contract.currency)}</b> miqdorida oldindan to'lov amalga oshirilishi shart. To'lov amalga oshirilgan kundan boshlab shartnoma kuchga kiradi va loyiha muddati shu kundan hisoblanadi.</p>
    <p>4.3. Agar belgilangan summadan kam mablag' tushirilsa, loyiha faqat tomonlar o'rtasida qo'shimcha kelishuv asosida boshlanishi mumkin.</p>
    <p>4.4. Mijoz tomonidan to'lov kechiktirilgan taqdirda, Kompaniya loyiha muddatini uzaytirish yoki xizmatni vaqtincha to'xtatish huquqiga ega bo'ladi.</p>
    <p>4.5. Agar Mijoz loyiha to'liq yakunlanmasidan bir tomonlama shartnomani bekor qilsa, Kompaniya tomonidan olingan avans qaytarilmaydi.</p>
    <p>4.6. Tomonlar tomonidan Texnik topshiriq (TZ) doirasidan tashqari qo'shimcha o'zgarishlar kiritilsa, ular alohida baholanadi.</p>
    <p>4.7. Yakuniy natija topshirilganidan so'ng, qolgan 50% miqdorida, ya'ni <b>${formatAmount(remaining, contract.currency)}</b> amalga oshiriladi. Jami: <b>${formatAmount(amount, contract.currency)}</b>.</p>
  </div>

  <div class="section-title">5. JAVOBGARLIK</div>
  <div class="section">
    <p>5.1. Tomonlar shartnoma shartlarini bajarmagan taqdirda O'zbekiston Respublikasi amaldagi qonunchiligiga muvofiq javobgar bo'ladilar.</p>
    <p>5.2. Kompaniya uchinchi tomon dasturlari (API, Payme, Click, Telegram, Server, Hosting, Google sheets, va boshqalar) faoliyatidagi nosozliklar uchun javobgar emas.</p>
  </div>

  <div class="section-title">6. FORS-MAJOR HOLATLAR</div>
  <p>6.1. Tomonlarning nazoratidan tashqarida bo'lgan tabiiy ofatlar, texnologik nosozliklar va boshqa fors-major holatlar sabab shartnoma bajarilmasa, tomonlar javobgar bo'lmaydi.</p>

  <div class="section-title">7. AMAL QILISH MUDDATI VA BEKOR QILISH</div>
  <p>7.1. Shartnoma tomonlar imzo qo'ygan kundan boshlab kuchga kiradi.</p>
  <p>7.2. Loyihaning yakuniy muddati: <b>${formatDate(contract.endDate)}</b> gacha.</p>

  <div class="section-title">8. YAKUNIY QOIDALAR</div>
  <p>8.1. Shartnomaga o'zgartirish va qo'shimchalar faqat ikki tomonning yozma ravishdagi kelishuvi asosida amalga oshiriladi.</p>
  <p>8.3. Kelishmovchiliklar dastlab muzokaralar yo'li bilan hal etiladi. Agar kelishuvga erishilmasa, masala sud tartibida ko'rib chiqiladi.</p>

  <div class="parties-grid">
    <div class="party-box">
      <h4>KOMPANIYA</h4>
      <div class="details">
        <b>"SAYD.X" YATT</b><br>
        Raxbar: Saidmuhammadalixon Ataullayev<br>
        Manzil: Toshkent sh., Yashnobod t., Obod makon 56/12 uy<br>
        H/r: 20218000207298668001<br>
        Bank: MFO 00444, STIR 637742163<br>
        Tel: +998 20 000 37 90
      </div>
    </div>
    <div class="party-box">
      <h4>MIJOZ</h4>
      <div class="details">
        <b>${esc(contract.company || contract.clientName)}</b><br>
        Vakil: ${esc(contract.clientName)}<br>
        To'lov turi: ${esc(contract.paymentType || "Karta/O'tkazma")}<br>
        E-mail: ${esc(contract.clientEmail || '---')}
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
      <div style="font-size: 7px; color: #94a3b8; font-family: monospace;">TOKEN: ${esc(contract.verificationToken || '---')}</div>
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

  const html = buildContractHtml(contract, settings, baseUrl, qrCodeDataUri);

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
