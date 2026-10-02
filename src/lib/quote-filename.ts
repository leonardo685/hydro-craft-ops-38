// Normaliza número do orçamento para o formato MH-XXX-YY usado nos nomes de arquivo.
export function numeroParaMH(numero: string | null | undefined): string {
  const raw = String(numero || "").trim();
  if (!raw) return "MH";
  if (/^MH[-_ ]/i.test(raw)) return raw.toUpperCase().replace(/[\/_ ]/g, "-");
  const m = raw.match(/(\d+)\D+(\d{2,4})$/);
  if (m) {
    const seq = String(parseInt(m[1], 10)).padStart(3, "0");
    const ano = m[2].slice(-2);
    return `MH-${seq}-${ano}`;
  }
  return `MH-${raw.replace(/[^a-zA-Z0-9]/g, "-")}`;
}
