/**
 * Currency Freaks API test — kurs ishlayaptimi yo'qmi tekshirish
 * Ishlasa: node server/test-currency-api.mjs
 */
import "dotenv/config";

const apiKey = process.env.CURRENCY_FREAKS_API_KEY;
if (!apiKey || apiKey === "YOUR_APIKEY") {
  console.log("❌ CURRENCY_FREAKS_API_KEY .env da yo'q yoki YOUR_APIKEY");
  process.exit(1);
}

const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${encodeURIComponent(apiKey)}&base=USD&symbols=UZS`;
console.log("Tekshirilmoqda: Currency Freaks API (UZS)...");

try {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);

  if (!res.ok) {
    console.log(`❌ API javob: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.log(text.slice(0, 300));
    process.exit(1);
  }

  const data = await res.json();
  const rate = data?.rates?.UZS;
  if (!rate) {
    console.log("❌ Javobda UZS kursi yo'q:", JSON.stringify(data).slice(0, 200));
    process.exit(1);
  }

  console.log("✅ API ishlayapti!");
  console.log(`   1 USD = ${rate} UZS`);
  process.exit(0);
} catch (err) {
  if (err.name === "AbortError") {
    console.log("❌ API 10 soniya ichida javob bermadi (timeout)");
  } else {
    console.log("❌ Xato:", err.message);
  }
  process.exit(1);
}
