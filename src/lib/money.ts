import Decimal from "decimal.js";

export function displayMoney(
  value: string | null | undefined,
  currency: string | null | undefined,
  locale = "en",
) {
  if (value === null || value === undefined || !currency) return "—";
  try {
    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    });
    const decimal = new Decimal(value);
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    const fixed = decimal.toFixed(digits);
    const [whole, fraction] = fixed.split(".") as [string, string | undefined];
    const wholeValue = BigInt(whole);
    const negativeZero = wholeValue === 0n && decimal.isNegative();
    const parts = format.formatToParts(negativeZero ? -0 : wholeValue);
    const digitFormat = new Intl.NumberFormat(locale, { useGrouping: false });
    return parts
      .map((part) =>
        part.type === "fraction" && fraction
          ? fraction.replace(/\d/g, (d) => digitFormat.format(Number(d)))
          : part.value,
      )
      .join("");
  } catch {
    return value + " " + currency;
  }
}
