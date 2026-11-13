import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { LOGO_BASE64 } from './logo.ts';

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (!req.headers.get('Authorization')) return json({ error: 'Não autorizado' }, 401);
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return json({ error: 'Gmail não configurado (GMAIL_USER / GMAIL_APP_PASSWORD).' }, 500);

    const b = await req.json();
    const emails: string[] = Array.isArray(b.emails) ? b.emails.filter(isEmail).slice(0, 20) : [];
    const tipo = b.tipo === 'invoice' ? 'invoice' : 'quote';
    const numero = String(b.numero || '').slice(0, 60);
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

    try {
      const attachments: Att[] = [{ filename: nomeArquivo, content: pdfBase64, contentType: 'application/pdf' }];
      if (incluirAssinatura) attachments.push({ filename: 'mec-hydro-logo.jpg', content: LOGO_BASE64, contentType: 'image/jpeg', cid: 'mechydrologo' });
      await sendSmtp(GMAIL_USER, GMAIL_APP_PASSWORD, `${empresaNome} <${GMAIL_USER}>`, emails, `${tituloCompleto} - ${empresaNome}`, html, attachments);
    } catch (err) {
      console.error('Gmail SMTP failed', err);
      return json({ error: 'Falha ao enviar e-mail pelo Gmail', details: err instanceof Error ? err.message : String(err) }, 502);
    }
    return json({ success: true });
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
