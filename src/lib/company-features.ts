/** Company-specific workflow capabilities, independent of the selected language. */
export function hasFiscalBilling(companyName: string | null | undefined): boolean {
  return !companyName?.trim().toUpperCase().includes('MEC HYDRO');
}

export function completionStatus(companyName: string | null | undefined, receiptId: number | null | undefined, quoteId: string | null | undefined): string {
  if (!hasFiscalBilling(companyName)) return 'finalizada';
  return receiptId ? 'aguardando_retorno' : quoteId ? 'finalizada' : 'faturado';
}