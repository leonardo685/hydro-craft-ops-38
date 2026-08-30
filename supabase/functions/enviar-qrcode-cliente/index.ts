import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

interface Payload {
  numeroOrdem?: string;
  clienteNome?: string;
  emails?: string[];
  link?: string;
  empresaNome?: string;
  qrBase64?: string;
}

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return json({ error: 'Serviço de e-mail não configurado (RESEND_API_KEY ausente).' }, 500);
    }

    const body = (await req.json()) as Payload;
    const numeroOrdem = typeof body.numeroOrdem === 'string' ? body.numeroOrdem.trim() : '';
    const link = typeof body.link === 'string' ? body.link.trim() : '';
    const emails = Array.isArray(body.emails) ? body.emails.filter(isEmail) : [];
    const clienteNome = typeof body.clienteNome === 'string' ? body.clienteNome.slice(0, 200) : '';
    const empresaNome = typeof body.empresaNome === 'string' ? body.empresaNome.slice(0, 200) : 'MEC HYDRO';
    const qrBase64 = typeof body.qrBase64 === 'string' ? body.qrBase64 : '';

    if (!numeroOrdem || !link.startsWith('http') || emails.length === 0) {
      return json({ error: 'Dados inválidos: informe a ordem, o link e ao menos um e-mail válido.' }, 400);
    }

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;margin:0 auto">
        <h2 style="margin:0 0 8px">Acompanhe seu serviço - Ordem ${numeroOrdem}</h2>
        <p style="margin:0 0 16px;color:#444">
          ${clienteNome ? `Olá, <strong>${clienteNome}</strong>.<br/>` : ''}
          Recebemos seu equipamento. Use o QR Code abaixo (ou o link) para acompanhar em tempo real
          a etapa em que o serviço se encontra. Quando o serviço for concluído, o mesmo QR Code passa a
          exibir o laudo técnico e o histórico de manutenção.
        </p>
        ${qrBase64 ? `<div style="text-align:center;margin:24px 0"><img src="cid:qrcode" alt="QR Code ${numeroOrdem}" width="220" height="220" /></div>` : ''}
        <p style="text-align:center;margin:0 0 24px">
          <a href="${link}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">
            Acompanhar serviço
          </a>
        </p>
        <p style="font-size:12px;color:#777;word-break:break-all">${link}</p>
        <p style="font-size:12px;color:#777">${empresaNome}</p>
      </div>
    `;

    const payload: Record<string, unknown> = {
      from: `${empresaNome} <onboarding@resend.dev>`,
      to: emails,
      subject: `Acompanhe seu serviço - Ordem ${numeroOrdem}`,
      html,
    };

    if (qrBase64) {
      payload.attachments = [
        {
          filename: `qrcode-${numeroOrdem}.png`,
          content: qrBase64,
          content_id: 'qrcode',
        },
      ];
    }

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend gateway failed [${response.status}]: ${errorBody}`);
      return json({ error: 'Falha ao enviar e-mail', status: response.status, details: errorBody }, response.status);
    }

    const result = await response.json();
    console.log('QR Code enviado', { numeroOrdem, emails, id: result?.id });
    return json({ success: true, id: result?.id });
  } catch (err) {
    console.error('Erro inesperado ao enviar QR Code:', err);
    return json({ error: err instanceof Error ? err.message : 'Erro inesperado' }, 500);
  }
});
