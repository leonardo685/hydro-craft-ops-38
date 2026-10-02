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
