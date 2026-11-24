import { describe, expect, it } from 'vitest';
import { quoteShippingOrderPrefix } from '../../supabase/functions/enviar-documento-orcamento/subject';

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
});
