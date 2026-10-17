/**
 * Número de pedido (P.O.) informado na aprovação do orçamento.
 *
 * Valores de preenchimento ("none", "n/a", "sem", ...) significam "não há pedido":
 * retornam string vazia para que o prefixo "P.O." não apareça no PDF, no nome do
 * arquivo nem nas telas. Números reais e referências como "contrato 1270" são
 * preservados.
 */
const PLACEHOLDER = /^(?:none|n[.\/\-]?a|null|undefined|no|sem|nenh[ua]m[a]?|-+|\.+|\?+|s[.\/\-]n)$/i;

export function normalizarNumeroPedido(valor: unknown): string {
  const texto = String(valor ?? "")
    .trim()
    .replace(/^(?:p\s*\.?\s*o\s*\.?\s*:?\s*)+/i, "")
    .trim();
  if (!texto || PLACEHOLDER.test(texto)) return "";
  return texto;
}
