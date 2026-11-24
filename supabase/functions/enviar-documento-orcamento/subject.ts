export function quoteShippingOrderPrefix(
  companyName: string,
  values: Array<string | null | undefined>,
): string {
  if (!companyName.trim().toUpperCase().includes('MEC HYDRO')) return '';
  const shippingOrders = [...new Set(values
    .map(value => String(value || '').trim())
    .filter(value => value && !/^(n\/?a|none)$/i.test(value)))];
  return shippingOrders.length ? `Shipping Order ${shippingOrders.join(', ')} - ` : '';
}
