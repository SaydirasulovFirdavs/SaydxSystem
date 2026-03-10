/**
 * Haqiqiy USD → UZS kursi — O'zbekiston Markaziy Banki (CBU) API orqali.
 * API ishlamasa: qo'lda kiritilgan yoki 12500.
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 soat
const FALLBACK_CACHE_MS = 45 * 1000; // 45 sek (fallback — tez qayta API ni sinash)
const FALLBACK_RATE = 12500;

export type RateSource = "api" | "manual" | "fallback";

export type UsdToUzsResult = { rate: number; source: RateSource };

let cached: UsdToUzsResult | null = null;
let cacheExpiry = 0;

export type GetManualRate = () => Promise<number | null>;

async function fetchFromCbuApi(): Promise<{ rate: number }> {
  // CBU Ochiq API (API key talab qilmaydi)
  const url = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/";
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!res.ok) throw new Error(`CBU API xatosi: ${res.status}`);

  type CbuResponse = Array<{ Ccy: string; Rate: string }>;
  const data = (await res.json()) as CbuResponse;

  const usdData = data.find(c => c.Ccy === "USD");
  if (!usdData || !usdData.Rate) throw new Error("CBU dan USD kursi topilmadi");

  const rate = Number(usdData.Rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Noto'g'ri CBU kurs qiymati: ${usdData.Rate}`);

  return { rate: Math.round(rate) };
}

export async function getUsdToUzsRate(getManualRate?: GetManualRate): Promise<UsdToUzsResult> {
  const now = Date.now();
  if (cached !== null && now < cacheExpiry) {
    return cached;
  }

  // 1. O'zbekiston Markaziy Banki API'dan kursni olishga harakat (maksimum 2 urinish)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { rate } = await fetchFromCbuApi();
      cached = { rate, source: "api" };
      cacheExpiry = now + CACHE_TTL_MS;
      if (attempt > 1) console.log("CBU API: qayta urinish muvaffaqiyatli");
      return cached;
    } catch (err) {
      console.error("DEBUG CBU API ERROR:", err);
      if (attempt === 1) console.warn("CBU API xato (1-urinish), qayta urinilmoqda:", (err as Error).message);
      else console.error("CBU API xato (Barcha urinishlar barbod bo'ldi):", (err as Error).message);
    }
  }

  // 2. Agar API mutlaqo ishlamasa, qo'lda saqlangan kursni olamiz
  if (getManualRate) {
    const manual = await getManualRate();
    if (manual != null) {
      cached = { rate: manual, source: "manual" };
      cacheExpiry = now + FALLBACK_CACHE_MS;
      return cached;
    }
  }

  // 3. Hech qaysisi ishlamasa, oxirgi chora sifatida tizimning default kursi (12500)
  cached = { rate: Number(process.env.USD_TO_UZS_RATE) || FALLBACK_RATE, source: "fallback" };
  cacheExpiry = now + FALLBACK_CACHE_MS;
  return cached;
}

