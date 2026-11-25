import { describe, expect, it } from 'vitest';
import { commercialEmailSubject, quoteShippingOrderPrefix } from '../../supabase/functions/enviar-documento-orcamento/subject';
import { shippingOrders } from '../../supabase/functions/enviar-documento-orcamento/shipping-order';

describe('Shipping Order no assunto da quote', () => {
  it('coloca o Shipping Order antes do número da quote na MEC HYDRO', () => {
    expect(quoteShippingOrderPrefix('MEC HYDRO', ['012634'])).toBe('Shipping Order 012634 - ');
  });

  it('agrupa números distintos e ignora valores ausentes', () => {
    expect(quoteShippingOrderPrefix('Mec Hydro LLC', ['012634', '012634', 'N/A', 'none', null, '012700']))
      .toBe('Shipping Order 012634, 012700 - ');
  });

  it('não transforma a Nota de entrada brasileira em Shipping Order', () => {
    expect(quoteShippingOrderPrefix('MEC HIDRO', ['943635'])).toBe('');
  });
  const quote = { id: 'a', numero_nota_entrada: '012634', assunto_proposta: 'Pump' };
  it('includes Shipping Order exactly once in the complete Quote subject', () => {
    expect(commercialEmailSubject('quote', '0056/26', ['a'], [quote], 'MEC HYDRO'))
      .toBe('Shipping Order 012634 - Quote 0056/26 - Pump - MEC HYDRO');
  });
  it('includes Shipping Order exactly once in the complete Invoice subject', () => {
    expect(commercialEmailSubject('invoice', '0056/26', ['a'], [quote], 'MEC HYDRO'))
      .toBe('Invoice 0056/26 - Shipping Order 012634 - Pump - MEC HYDRO');
  });
  it.each(['quote', 'invoice'] as const)('preserves Brazilian %s subjects without Shipping Order', tipo => {
    expect(commercialEmailSubject(tipo, '0056/26', ['a'], [{ ...quote, numero_nota_entrada: '943635' }], 'MEC HIDRO'))
      .toBe(`${tipo === 'quote' ? 'Quote' : 'Invoice'} 0056/26 - Pump - MEC HIDRO`);
  });
  it('does not add a Brazilian entry invoice to the body reference data', () => {
    expect(shippingOrders(['a'], [{ ...quote, numero_nota_entrada: '943635' }], 'MEC HIDRO')).toEqual([]);
  });
  it('retains the US body reference data', () => {
    expect(shippingOrders(['a'], [quote], 'MEC HYDRO')).toEqual(['012634']);
  });
  it('keeps unique Shipping Orders in grouped Invoice selection order', () => {
    expect(commercialEmailSubject('invoice', '0057/26, 0056/26', ['b', 'a'], [quote, { ...quote, id: 'b', numero_nota_entrada: '012700' }], 'MEC HYDRO'))
      .toBe('Invoice 0057/26, 0056/26 - Shipping Order 012700, 012634 - MEC HYDRO');
  });
  it('omits placeholder Shipping Orders and preserves the proposal subject', () => {
    expect(commercialEmailSubject('quote', '0056/26', ['a'], [{ ...quote, numero_nota_entrada: '---' }], 'MEC HYDRO'))
      .toBe('Quote 0056/26 - Pump - MEC HYDRO');
  });
});
