/**
 * Normaliza o símbolo de moeda em todo o app: exibe apenas "$" (sem o "R").
 * Aplica-se a Intl.NumberFormat e Number#toLocaleString.
 */
const stripR = (value: string) =>
  typeof value === "string" ? value.replace(/R\$/g, "$").replace(/\bBRL\b/g, "$") : value;

export function installCurrencySymbolNormalization() {
  const anyGlobal = globalThis as any;
  if (anyGlobal.__currencySymbolPatched) return;
  anyGlobal.__currencySymbolPatched = true;

  const originalFormat = Intl.NumberFormat.prototype.format;
  Intl.NumberFormat.prototype.format = function (value: number) {
    return stripR(originalFormat.call(this, value));
  };

  const originalToLocaleString = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (...args: any[]) {
    return stripR(originalToLocaleString.apply(this, args as any));
  };
}
