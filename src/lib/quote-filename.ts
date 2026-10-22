// Normaliza o número próprio do orçamento para nomes de arquivo, sem o prefixo de ordem de serviço "MH".
export function numeroOrcamentoParaArquivo(numero: string | null | undefined): string {
  const raw = String(numero || "").trim();
  if (!raw) return "Orcamento";
  const semPrefixo = raw.replace(/^MH[-_ ]*/i, "");
  const m = semPrefixo.match(/(\d+)\D+(\d{2,4})$/);
  if (m) {
    const seq = m[1];
    const ano = m[2].slice(-2);
    return `${seq}-${ano}`;
  }
  return semPrefixo.replace(/[^a-zA-Z0-9]/g, "-");
}

// Statuses em que o orçamento já vira Invoice (aprovado em diante, incluindo finalizado).
export const STATUS_APROVADO_INVOICE = [
  "aprovado",
  "faturamento",
  "faturado",
  "finalizado",
  "finalizada",
  "concluido",
  "concluído",
];

import { normalizarNumeroPedido } from "@/lib/pedido-utils";

// Regra única de nome de arquivo: aprovado/finalizado => Invoice, com "PO <número>" na frente quando houver pedido.
export function nomeArquivoOrcamentoPDF(
  o: { numero?: string | null; numero_revisao?: number | null; numero_pedido?: unknown; status?: string | null },
  idiomaPt: boolean = false
): string {
  const base = numeroOrcamentoParaArquivo(o.numero);
  const sufixoRevisao = o.numero_revisao ? ` REV${o.numero_revisao}` : "";
  const aprovado = STATUS_APROVADO_INVOICE.includes(String(o.status || "").toLowerCase());
  if (!aprovado) {
    return `${idiomaPt ? "Orcamento" : "Quote"} ${base}${sufixoRevisao}.pdf`;
  }
  const numeroPedido = normalizarNumeroPedido(o.numero_pedido);
  return numeroPedido
    ? `PO ${numeroPedido} - Invoice ${base}${sufixoRevisao}.pdf`
    : `Invoice ${base}${sufixoRevisao}.pdf`;
}
