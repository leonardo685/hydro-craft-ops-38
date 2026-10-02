/**
 * Normaliza o símbolo de moeda em todo o app: exibe apenas "$" (sem o "R").
 * Aplica-se a Intl.NumberFormat e Number#toLocaleString.
 */
// Empresas brasileiras (ex.: MEC HIDRO) mantêm "R$"; só a MEC HYDRO (EUA) usa "$".
const isEmpresaBrasil = () => {
  try {
    const nome = (localStorage.getItem("empresa_atual_nome") || "").toUpperCase();
    return !nome.includes("MEC HYDRO");
  } catch {
    return false;
  }
};

const stripR = (value: string) => {
  if (typeof value !== "string") return value;
  if (isEmpresaBrasil()) return value;
  return value.replace(/R\$/g, "$").replace(/\bBRL\b/g, "$");
};

export function installCurrencySymbolNormalization() {
  const anyGlobal = globalThis as any;
  if (anyGlobal.__currencySymbolPatched) return;
  anyGlobal.__currencySymbolPatched = true;

  // `Intl.NumberFormat.prototype.format` é um getter que devolve uma função
  // vinculada à instância — precisa ser envolvido pelo próprio getter.
  const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, "format");
  if (descriptor?.get) {
    const originalGetter = descriptor.get;
    Object.defineProperty(Intl.NumberFormat.prototype, "format", {
      ...descriptor,
      get() {
        const bound = originalGetter.call(this) as (value: number) => string;
        return (value: number) => stripR(bound(value));
      },
    });
  }


  const originalToLocaleString = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (...args: any[]) {
    return stripR(originalToLocaleString.apply(this, args as any));
  };
}
