import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import Stripe from 'npm:stripe@18.0.0';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return json({ error: 'STRIPE_SECRET_KEY não configurada' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null);
    const orcamentoId = body?.orcamento_id;
    const origin = typeof body?.origin === 'string' ? body.origin : req.headers.get('origin') || '';
    const clienteEmail = typeof body?.cliente_email === 'string' && body.cliente_email.includes('@')
      ? body.cliente_email
      : undefined;

    if (typeof orcamentoId !== 'string' || orcamentoId.length < 10) {
      return json({ error: 'orcamento_id inválido' }, 400);
    }

    // Lê o orçamento com o token do usuário: a RLS garante que ele pertence à empresa dele
    const { data: orcamento, error: orcError } = await supabaseAuth
      .from('orcamentos')
      .select('id, numero, cliente_nome, equipamento, valor, empresa_id')
      .eq('id', orcamentoId)
      .maybeSingle();

    if (orcError) {
      console.error('Erro ao buscar orçamento:', orcError);
      return json({ error: 'Erro ao buscar orçamento' }, 500);
    }
    if (!orcamento) {
      return json({ error: 'Orçamento não encontrado' }, 404);
    }

    const valor = Number(orcamento.valor || 0);
    if (!(valor > 0)) {
      return json({ error: 'Orçamento sem valor definido' }, 400);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      customer_email: clienteEmail,
      client_reference_id: orcamento.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(valor * 100),
            product_data: {
              name: `Proposal ${orcamento.numero}`,
              description: `${orcamento.equipamento} — ${orcamento.cliente_nome}`.slice(0, 300),
            },
          },
        },
      ],
      metadata: {
        orcamento_id: orcamento.id,
        empresa_id: orcamento.empresa_id ?? '',
        numero: orcamento.numero ?? '',
      },
      success_url: `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pagamento-cancelado`,
    });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: insertError } = await admin.from('pagamentos_stripe').insert({
      empresa_id: orcamento.empresa_id,
      orcamento_id: orcamento.id,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      checkout_url: session.url,
      valor,
      moeda: 'usd',
      status: 'pendente',
      cliente_email: clienteEmail ?? null,
    });

    if (insertError) {
      console.error('Erro ao registrar pagamento:', insertError);
      return json({ error: 'Erro ao registrar pagamento' }, 500);
    }

    await admin
      .from('orcamentos')
      .update({ link_pagamento: session.url })
      .eq('id', orcamento.id);

    return json({ url: session.url, session_id: session.id });
  } catch (e) {
    console.error('Erro inesperado:', e);
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500);
  }
});
