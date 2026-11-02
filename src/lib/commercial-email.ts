/** Commercial tab eligibility and email document type. */
export function commercialEmailType(status: string | null | undefined): "quote" | "invoice" | null {
  if (status === "rejeitado") return null;
  return ["aprovado", "faturamento", "finalizado"].includes(status || "") ? "invoice" : "quote";
}