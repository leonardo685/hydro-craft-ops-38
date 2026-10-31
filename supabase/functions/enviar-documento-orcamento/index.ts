import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';
const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    if (!req.headers.get('Authorization')) return json({ error: 'Não autorizado' }, 401);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: 'Serviço de e-mail não configurado.' }, 500);

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

    const titulo = tipo === 'invoice' ? `Invoice ${numero}` : `Quote ${numero}`;
    const incluirAssinatura = b.assinatura === true;
    const assinaturaHtml = `
      <table style="margin-top:28px;border-collapse:collapse;font-family:Arial,sans-serif;color:#1a1a1a">
        <tr>
          <td style="padding-right:16px;border-right:2px solid #d92b2b;vertical-align:middle">
            <img src="https://fixzys.lovable.app/mec-hydro-logo.jpg" alt="MEC HYDRO" width="110" style="display:block;border:0" />
          </td>
          <td style="padding-left:16px;vertical-align:middle;font-size:13px;line-height:1.7">
            <div style="font-size:17px;font-weight:bold">Bruno Forte</div>
            <div>Sales Representative</div>
            <div style="font-weight:bold">Mec Hydro Hydraulics</div>
            <div><span style="font-size:12px">📱</span> <a href="tel:+12035456510" style="color:#1a1a1a;text-decoration:none">+1 (203) 545-6510</a></div>
            <div><span style="font-size:12px">✉️</span> <a href="mailto:bruno.forte@mechydro.com" style="color:#1155cc">bruno.forte@mechydro.com</a></div>
            <div><span style="font-size:12px">🌐</span> <a href="https://www.mechydro.com" style="color:#1155cc">www.mechydro.com</a></div>
          </td>
        </tr>
      </table>`;
    const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:0 auto">
      <h2 style="margin:0 0 12px">${esc(titulo)}</h2>
      ${clienteNome ? `<p>Hello, <strong>${esc(clienteNome)}</strong>.</p>` : ''}
      <p style="white-space:pre-line;color:#333">${esc(mensagem || (tipo === 'invoice'
        ? 'Please find attached the invoice for the services provided.'
        : 'Please find attached our quote for your review.'))}</p>
      ${incluirAssinatura ? assinaturaHtml : `<p style="font-size:12px;color:#777">${esc(empresaNome)}</p>`}</div>`;

    const r = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': RESEND_API_KEY },
      body: JSON.stringify({
        from: `${empresaNome} <onboarding@resend.dev>`,
        to: emails,
        subject: `${titulo} - ${empresaNome}`,
        html,
        attachments: [{ filename: nomeArquivo, content: pdfBase64 }],
      }),
    });
    if (!r.ok) {
      const details = await r.text();
      console.error(`Resend failed [${r.status}]: ${details}`);
      return json({ error: 'Falha ao enviar e-mail', details }, r.status);
    }
    const result = await r.json();
    return json({ success: true, id: result?.id });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});
