import type { AppSettings } from "./settings";

export function formatPrice(price: number | string, settings?: AppSettings): string {
  const num = Number(price);
  const currency = settings?.currency ?? "LKR";

  if (currency === "USD") {
    return `$${num.toFixed(2)}`;
  }

  return `LKR ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
