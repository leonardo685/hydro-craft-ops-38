export type EmailDocumentType = 'quote' | 'invoice';

export async function sendAndRecordEmail(
  send: () => Promise<void>,
  record: (sentAt: string) => Promise<void>,
) {
  await send();
  const sentAt = new Date().toISOString();
  try {
    await record(sentAt);
    return { success: true, sentAt, trackingSaved: true };
  } catch {
    // SMTP already accepted the message: do not prompt a duplicate send.
    return { success: true, sentAt, trackingSaved: false };
  }
}

export function sentColumn(tipo: EmailDocumentType) {
  return tipo === 'invoice' ? 'email_invoice_enviado_em' : 'email_quote_enviado_em';
}