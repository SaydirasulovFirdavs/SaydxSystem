import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

const STORAGE_KEY = "s-ubos-display-currency";
const FALLBACK_UZS_PER_USD = 12_500;

export type DisplayCurrency = "UZS" | "USD";

export function useCurrency() {
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(() => {
    if (typeof window === "undefined") return "UZS";
    const saved = localStorage.getItem(STORAGE_KEY) as DisplayCurrency | null;
    return saved === "USD" || saved === "UZS" ? saved : "UZS";
  });

  const { data: rateData } = useQuery({
    queryKey: ["/api/currency-rate"],
    queryFn: async () => {
      const res = await fetch("/api/currency-rate", { credentials: "include" });
      const data = (await res.json()) as { usdToUzs?: number };
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
  const uzsPerUsd = typeof rateData?.usdToUzs === "number" && rateData.usdToUzs > 0 ? rateData.usdToUzs : FALLBACK_UZS_PER_USD;

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch (_) {}
  }, []);

  /** Summalar API dan hamma vaqt UZS da keladi. Agar displayCurrency USD bo'lsa, konvertatsiya qilamiz. */
  const formatMoney = useCallback(
    (amountUzs: number): string => {
      if (displayCurrency === "USD") {
        const usd = amountUzs / uzsPerUsd;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(usd);
      }
      return new Intl.NumberFormat("uz-UZ", {
        style: "currency",
        currency: "UZS",
        maximumFractionDigits: 0,
      }).format(amountUzs);
    },
    [displayCurrency, uzsPerUsd]
  );

  /** UZS dan USD ga (son sifatida). */
  const toUsd = useCallback(
    (amountUzs: number): number => amountUzs / uzsPerUsd,
    [uzsPerUsd]
  );

  return { displayCurrency, setDisplayCurrency, formatMoney, uzsPerUsd, toUsd };
}
