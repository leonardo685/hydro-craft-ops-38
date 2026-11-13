import { describe, expect, it, vi } from 'vitest';
import { sendAndRecordEmail, sentColumn } from '../../supabase/functions/enviar-documento-orcamento/sent-status';

describe('Successful email sent status', () => {
  it('records Sent only after SMTP succeeds', async () => {
    const sequence: string[] = [];
    const result = await sendAndRecordEmail(async () => { sequence.push('send'); }, async () => { sequence.push('record'); });
    expect(sequence).toEqual(['send', 'record']);
    expect(result.trackingSaved).toBe(true);
    expect(Number.isNaN(Date.parse(result.sentAt))).toBe(false);
  });
  it('does not record Sent when email fails', async () => {
    const record = vi.fn();
    await expect(sendAndRecordEmail(async () => { throw new Error('SMTP failed'); }, record)).rejects.toThrow('SMTP failed');
    expect(record).not.toHaveBeenCalled();
  });
  it('does not report email failure if recording fails after sending', async () => {
    const result = await sendAndRecordEmail(async () => {}, async () => { throw new Error('database unavailable'); });
    expect(result).toMatchObject({ success: true, trackingSaved: false });
  });
  it('records Quote and Invoice sends separately', () => {
    expect(sentColumn('quote')).toBe('email_quote_enviado_em');
    expect(sentColumn('invoice')).toBe('email_invoice_enviado_em');
  });
});