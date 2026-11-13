import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { LOGO_BASE64 } from './logo.ts';
import { sendAndRecordEmail, sentColumn } from './sent-status.ts';

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
const BodySchema = z.object({
  empresaId: z.string().uuid(),
  orcamentoIds: z.array(z.string().uuid()).min(1).max(100).transform(ids => [...new Set(ids)]),
  tipo: z.enum(['quote', 'invoice']),
  numero: z.string().min(1).max(2000),
  clienteNome: z.string().max(200),
  empresaNome: z.string().min(1).max(200),
  assinatura: z.boolean(),
  emails: z.array(z.string().email()).min(1).max(20),
  mensagem: z.string().max(10000),
  nomeArquivo: z.string().min(1).max(200).refine(v => !/[\r\n"\\]/.test(v)),
  pdfBase64: z.string().min(1).max(50_000_000).regex(/^[A-Za-z0-9+/=\s]+$/),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Não autorizado' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: 'Não autorizado' }, 401);
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return json({ error: 'Gmail não configurado (GMAIL_USER / GMAIL_APP_PASSWORD).' }, 500);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Dados de e-mail inválidos', details: parsed.error.flatten().fieldErrors }, 400);
    const b = parsed.data;
    const { data: quotes, error: quotesError } = await client.from('orcamentos')
      .select('id, status').eq('empresa_id', b.empresaId).in('id', b.orcamentoIds);
    if (quotesError || quotes?.length !== b.orcamentoIds.length) return json({ error: 'Documento indisponível nesta empresa.' }, 403);
    if (quotes.some(q => q.status === 'rejeitado' ||
      (['aprovado', 'faturamento', 'finalizado'].includes(q.status) ? 'invoice' : 'quote') !== b.tipo)) {
      return json({ error: 'O tipo do documento não corresponde à cotação.' }, 400);
    }
    const emails: string[] = Array.isArray(b.emails) ? b.emails.filter(isEmail).slice(0, 20) : [];
    const tipo = b.tipo === 'invoice' ? 'invoice' : 'quote';
    const numero = b.numero;
    const clienteNome = String(b.clienteNome || '').slice(0, 200);
    const empresaNome = String(b.empresaNome || 'MEC HYDRO').slice(0, 200);
    const mensagem = String(b.mensagem || '').slice(0, 3000);
    const nomeArquivo = String(b.nomeArquivo || `${tipo}.pdf`).slice(0, 200);
    const pdfBase64 = typeof b.pdfBase64 === 'string' ? b.pdfBase64 : '';
    if (!numero || !emails.length || !pdfBase64) return json({ error: 'Informe o documento e ao menos um e-mail válido.' }, 400);
    if (pdfBase64.length > 50_000_000) return json({ error: 'PDF muito grande para envio.' }, 400);

    const titulo = tipo === 'invoice' ? 'Invoice' : 'Quote';
    const tituloCompleto = tipo === 'invoice' ? `Invoice ${numero}` : `Quote ${numero}`;
    const incluirAssinatura = b.assinatura === true;
    const assinaturaHtml = `<table cellpadding="0" cellspacing="0" style="margin-top:28px;border-collapse:collapse;font-family:Arial,sans-serif;color:#1a1a1a"><tr>` +
      `<td style="padding-right:16px;border-right:2px solid #d92b2b;vertical-align:middle"><img src="cid:mechydrologo" alt="MEC HYDRO" width="120" style="display:block;border:0" /></td>` +
      `<td style="padding-left:16px;vertical-align:middle;font-size:13px;line-height:1.7">` +
      `<div style="font-size:17px;font-weight:bold">Bruno Forte</div><div>Sales Representative</div>` +
      `<div style="font-weight:bold">Mec Hydro Hydraulics</div>` +
      `<div><a href="tel:+12547332028" style="color:#1a1a1a;text-decoration:none">+1 (254) 733-2028</a></div>` +
      `<div><a href="mailto:bruno.forte@mechydro.com" style="color:#1155cc">bruno.forte@mechydro.com</a></div>` +
      `<div><a href="https://www.mechydro.com" style="color:#1155cc">www.mechydro.com</a></div>` +
      `</td></tr></table>`;
    const corpo = esc(mensagem || (tipo === 'invoice'
      ? `Hello${clienteNome ? ` ${clienteNome}` : ''},\n\nPlease find attached the invoice for the services provided.\n\nIf you have any questions, please let us know.`
      : `Hello${clienteNome ? ` ${clienteNome}` : ''},\n\nPlease find attached our quote for your review.`))
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .split('\n').map((l) => l.trim() ? `<p style="margin:0 0 4px">${l.trim()}</p>` : '<p style="margin:0 0 10px">&nbsp;</p>').join('');
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222;max-width:600px">` +
      `<h2 style="margin:0 0 16px;font-size:20px;color:#111">${esc(titulo)}</h2>${corpo}` +
      (incluirAssinatura ? assinaturaHtml : `<p style="font-size:12px;color:#777">${esc(empresaNome)}</p>`) + `</div>`;

    let result;
    try {
      const attachments: Att[] = [{ filename: nomeArquivo, content: pdfBase64, contentType: 'application/pdf' }];
      if (incluirAssinatura) attachments.push({ filename: 'mec-hydro-logo.jpg', content: LOGO_BASE64, contentType: 'image/jpeg', cid: 'mechydrologo' });
      result = await sendAndRecordEmail(
        () => sendSmtp(GMAIL_USER, GMAIL_APP_PASSWORD, `${empresaNome} <${GMAIL_USER}>`, emails, `${tituloCompleto} - ${empresaNome}`, html, attachments),
        async sentAt => {
          const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
          const { data: saved, error } = await admin.from('orcamentos')
            .update({ [sentColumn(tipo)]: sentAt }).eq('empresa_id', b.empresaId).in('id', b.orcamentoIds).select('id');
          if (error || saved?.length !== b.orcamentoIds.length) {
            console.error('Email sent status could not be saved', error?.message);
            throw new Error('Sent status not saved');
          }
        },
      );
    } catch (err) {
      console.error('Gmail SMTP failed', err);
      return json({ error: 'Falha ao enviar e-mail pelo Gmail', details: err instanceof Error ? err.message : String(err) }, 502);
    }
    return json({ ...result, orcamentoIds: b.orcamentoIds, tipo });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});

type Att = { filename: string; content: string; contentType: string; cid?: string };
const enc = new TextEncoder();
const b64 = (t: string) => btoa(String.fromCharCode(...enc.encode(t)));
const hdr = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const wrap = (s: string) => { const c = s.replace(/\s+/g, ''); const out: string[] = []; for (let i = 0; i < c.length; i += 76) out.push(c.slice(i, i + 76)); return out.join('\r\n'); };

async function sendSmtp(user: string, pass: string, from: string, to: string[], subject: string, html: string, atts: Att[]) {
  const conn = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 });
  const dec = new TextDecoder();
  let buf = '';
  const read = async (): Promise<string> => {
    while (true) {
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) { const r = lines.slice(0, i + 1).join('\n'); buf = lines.slice(i + 1).join('\r\n'); return r; }
      }
      const chunk = new Uint8Array(4096); const n = await conn.read(chunk);
      if (n === null) throw new Error('SMTP connection closed');
      buf += dec.decode(chunk.subarray(0, n));
    }
  };
  const write = async (data: string) => { const b = enc.encode(data); let o = 0; while (o < b.length) o += await conn.write(b.subarray(o)); };
  const cmd = async (c: string, ok: string) => { await write(c + '\r\n'); const r = await read(); if (!r.startsWith(ok)) throw new Error(`SMTP ${c.split(' ')[0]}: ${r}`); return r; };
  try {
    const g = await read(); if (!g.startsWith('220')) throw new Error(g);
    await cmd('EHLO mechydro.com', '250');
    await cmd('AUTH LOGIN', '334'); await cmd(btoa(user), '334'); await cmd(btoa(pass), '235');
    await cmd(`MAIL FROM:<${user}>`, '250');
    for (const r of to) await cmd(`RCPT TO:<${r}>`, '25');
    await cmd('DATA', '354');
    const mix = 'mix_' + crypto.randomUUID(), rel = 'rel_' + crypto.randomUUID();
    const inline = atts.filter((a) => a.cid), files = atts.filter((a) => !a.cid);
    const parts: string[] = [
      `From: ${hdr(from)}`, `To: ${to.join(', ')}`, `Subject: ${hdr(subject)}`, `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@mechydro.com>`, 'MIME-Version: 1.0', `Content-Type: multipart/mixed; boundary="${mix}"`, '',
      `--${mix}`, `Content-Type: multipart/related; boundary="${rel}"`, '',
      `--${rel}`, 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(html)),
    ];
    for (const a of inline) parts.push(`--${rel}`, `Content-Type: ${a.contentType}; name="${a.filename}"`, 'Content-Transfer-Encoding: base64', `Content-ID: <${a.cid}>`, `Content-Disposition: inline; filename="${a.filename}"`, '', wrap(a.content));
    parts.push(`--${rel}--`);
    for (const a of files) parts.push(`--${mix}`, `Content-Type: ${a.contentType}; name="${hdr(a.filename)}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${hdr(a.filename)}"`, '', wrap(a.content));
    parts.push(`--${mix}--`, '');
    await write(parts.join('\r\n'));
    await cmd('\r\n.', '250');
    try { await write('QUIT\r\n'); } catch (_) { /* ignore */ }
  } finally {
    try { conn.close(); } catch (_) { /* ignore */ }
  }
}
