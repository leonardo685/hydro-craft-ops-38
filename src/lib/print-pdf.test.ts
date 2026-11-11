import { afterEach, expect, it, vi } from 'vitest';
import { preparePDFPrint } from './print-pdf';
afterEach(() => vi.restoreAllMocks());
it('reports blocked print windows before generating a document', () => {
  vi.spyOn(window, 'open').mockReturnValue(null);
  expect(() => preparePDFPrint()).toThrow('Allow pop-ups');
});
it('loads the generated PDF and invokes printing from its frame', () => {
  const preview = { document: document.implementation.createHTMLDocument(), close: vi.fn(), addEventListener: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(preview as unknown as Window);
  URL.createObjectURL = vi.fn(() => 'blob:print');
  const printer = preparePDFPrint();
  printer.show(new ArrayBuffer(4), 'Invoice.pdf');
  const frame = preview.document.querySelector('iframe');
  const print = vi.fn();
  Object.defineProperty(frame, 'contentWindow', { value: { focus: vi.fn(), print } });
  frame?.dispatchEvent(new Event('load'));
  expect(frame?.src).toContain('blob:print');
  expect(print).toHaveBeenCalledOnce();
});