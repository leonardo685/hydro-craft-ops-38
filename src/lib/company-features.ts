/** Company-specific workflow capabilities, independent of the selected language. */
export function hasFiscalBilling(companyName: string | null | undefined): boolean {
  return !companyName?.trim().toUpperCase().includes('MEC HYDRO');
}

/** Only Brazilian documents print the linked service order number. */
export function showsOrderReference(companyName: string | null | undefined): boolean {
  return hasFiscalBilling(companyName);
}

export function completionStatus(companyName: string | null | undefined, receiptId: number | null | undefined, quoteId: string | null | undefined): string {
  if (!hasFiscalBilling(companyName)) return 'finalizada';
  return receiptId ? 'aguardando_retorno' : quoteId ? 'finalizada' : 'faturado';
}