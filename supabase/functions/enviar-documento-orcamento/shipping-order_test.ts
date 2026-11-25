import { assertEquals } from 'jsr:@std/assert@1';
import { subjectDetails } from './shipping-order.ts';

Deno.test('subject includes the Shipping Order and proposal subject', () => {
  assertEquals(subjectDetails(['a'], [{ id: 'a', numero_nota_entrada: '012634', assunto_proposta: 'SERVIÇO TAP HOLE' }], 'MEC HYDRO'), 'Shipping Order 012634 - SERVIÇO TAP HOLE');
});
Deno.test('subject omits N/A Shipping Order', () => {
  assertEquals(subjectDetails(['a'], [{ id: 'a', numero_nota_entrada: 'N/A', assunto_proposta: 'X' }], 'MEC HYDRO'), 'X');
});
