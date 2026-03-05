/**
 * Haqiqiy USD → UZS kursi — Currency Freaks API orqali (real kurs).
 * API ishlamasa: qo'lda kiritilgan yoki 12500.
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 soat
const FALLBACK_CACHE_MS = 45 * 1000; // 45 sek
const FALLBACK_RATE = 12500;

export type RateSource = "api" | "manual" | "fallback";

export type UsdToUzsResult = { rate: number; source: RateSource };

let cached: UsdToUzsResult | null = null;
let cacheExpiry = 0;

export type GetManualRate = () => Promise<number | null>;

async function fetchFromApi(apiKey: string): Promise<{ rate: number }> {
  const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${encodeURIComponent(apiKey)}&base=USD&symbols=UZS`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as { rates?: { UZS?: string }; base?: string };
  const rateStr = data?.rates?.UZS;
  if (!rateStr) throw new Error("UZS rate yo'q");
  const rate = Number(rateStr);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Noto'g'ri kurs");
  return { rate: Math.round(rate) };
}

export async function getUsdToUzsRate(getManualRate?: GetManualRate): Promise<UsdToUzsResult> {
  const now = Date.now();
  if (cached !== null && now < cacheExpiry) return cached;

  const apiKey = process.env.CURRENCY_FREAKS_API_KEY;
  if (!apiKey || apiKey === "YOUR_APIKEY") {
    if (getManualRate) {
      const manual = await getManualRate();
      if (manual != null) {
        cached = { rate: manual, source: "manual" };
        cacheExpiry = now + CACHE_TTL_MS;
        return cached;
      }
    }
    cached = { rate: Number(process.env.USD_TO_UZS_RATE) || FALLBACK_RATE, source: "fallback" };
    cacheExpiry = now + FALLBACK_CACHE_MS;
    return cached;
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { rate } = await fetchFromApi(apiKey);
      cached = { rate, source: "api" };
      cacheExpiry = now + CACHE_TTL_MS;
      return cached;
    } catch (err) {
      if (attempt === 2) console.warn("Currency Freaks API xato:", (err as Error).message);
    }
  }

  if (getManualRate) {
    const manual = await getManualRate();
    if (manual != null) {
      cached = { rate: manual, source: "manual" };
      cacheExpiry = now + FALLBACK_CACHE_MS;
      return cached;
    }
  }
  cached = { rate: Number(process.env.USD_TO_UZS_RATE) || FALLBACK_RATE, source: "fallback" };
  cacheExpiry = now + FALLBACK_CACHE_MS;
  return cached;
}
