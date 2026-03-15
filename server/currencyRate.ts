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

export type GetFinanceSettings = () => Promise<{ manualUsdToUzs: number | null; useAutomaticRate: boolean }>;

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

export async function getUsdToUzsRate(getFinanceSettings?: GetFinanceSettings): Promise<UsdToUzsResult> {
  const now = Date.now();
  if (cached !== null && now < cacheExpiry) {
    return cached;
  }

  // Settings ni olish
  const settings = getFinanceSettings ? await getFinanceSettings() : { manualUsdToUzs: null, useAutomaticRate: true };

  // 1. Agar avtomatik rejim yoqilgan bo'lsa, API dan olishga harakat qilamiz
  if (settings.useAutomaticRate) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { rate } = await fetchFromCbuApi();
        cached = { rate, source: "api" };
        cacheExpiry = now + CACHE_TTL_MS;
        return cached;
      } catch (err) {
        console.error("CBU API Connection attempt failed:", attempt, err);
      }
    }
  }

  // 2. Agar avtomatik o'chirilgan bo'lsa YOKI API ishlamasa, qo'lda kiritilgan kursni olamiz
  if (settings.manualUsdToUzs != null) {
    cached = { rate: settings.manualUsdToUzs, source: "manual" };
    cacheExpiry = now + FALLBACK_CACHE_MS;
    return cached;
  }

  // 3. Agar qo'lda ham yo'q bo'lsa (lekin avto o'chirilgan bo'lsa ham), oxirgi chora sifatida API ni yana bir bor sinaymiz (fallback rejimda)
  if (!settings.useAutomaticRate) {
    try {
      const { rate } = await fetchFromCbuApi();
      cached = { rate, source: "api" };
      cacheExpiry = now + FALLBACK_CACHE_MS;
      return cached;
    } catch (err) {
      // Ignored
    }
  }

  // 4. Mutlaqo hech narsa ishlamasa, tizimning default kursi
  cached = { rate: Number(process.env.USD_TO_UZS_RATE) || FALLBACK_RATE, source: "fallback" };
  cacheExpiry = now + FALLBACK_CACHE_MS;
  return cached;
}

