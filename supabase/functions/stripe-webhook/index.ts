import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@18.0.0';

const admin = () =>
  createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

async function marcarPago(
  db: ReturnType<typeof admin>,
  sessionId: string,
  paymentIntentId: string | null,
  metodo: string | null,
) {
  const { data: pagamento } = await db
    .from('pagamentos_stripe')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (!pagamento) {
    console.error('Pagamento não encontrado para sessão', sessionId);
    return;
  }
  if (pagamento.status === 'pago') {
    console.log('Pagamento já processado', sessionId);
    return;
  }

  const { data: orcamento } = await db
    .from('orcamentos')
    .select('id, numero, cliente_nome, empresa_id')
    .eq('id', pagamento.orcamento_id)
    .maybeSingle();

  // Conta bancária usada para a baixa (configurável em configuracoes_sistema)
  let contaBancaria = 'Stripe';
  if (pagamento.empresa_id) {
    const { data: config } = await db
      .from('configuracoes_sistema')
      .select('valor')
      .eq('empresa_id', pagamento.empresa_id)
      .eq('chave', 'conta_bancaria_stripe')
      .maybeSingle();
    if (config?.valor) contaBancaria = config.valor;
  }

  const agora = new Date().toISOString();

  const { data: lancamento, error: lancError } = await db
    .from('lancamentos_financeiros')
    .insert({
      tipo: 'entrada',
      descricao: `Pagamento online - Proposta ${orcamento?.numero ?? ''}`.trim(),
      valor: Number(pagamento.valor),
      conta_bancaria: contaBancaria,
      fornecedor_cliente: orcamento?.cliente_nome ?? null,
      data_esperada: agora,
      data_realizada: agora,
      data_emissao: agora,
      pago: true,
      forma_pagamento: 'a_vista',
      empresa_id: pagamento.empresa_id,
    })
    .select('id')
    .maybeSingle();

  if (lancError) console.error('Erro ao criar lançamento:', lancError);

  await db
    .from('pagamentos_stripe')
    .update({
      status: 'pago',
      metodo,
      paid_at: agora,
      stripe_payment_intent_id: paymentIntentId ?? pagamento.stripe_payment_intent_id,
      lancamento_id: lancamento?.id ?? null,
    })
    .eq('id', pagamento.id);

  if (orcamento?.id) {
    await db.from('orcamentos').update({ data_pagamento: agora }).eq('id', orcamento.id);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    console.error('Segredos da Stripe não configurados');
    return new Response('Missing configuration', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-03-31.basil' });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (e) {
    console.error('Assinatura inválida:', e instanceof Error ? e.message : e);
    return new Response('Invalid signature', { status: 400 });
  }

  const db = admin();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          await marcarPago(
            db,
            session.id,
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
            session.payment_method_types?.[0] ?? null,
          );
        } else {
          console.log('Sessão concluída aguardando confirmação (ACH):', session.id);
        }
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await db
          .from('pagamentos_stripe')
          .update({ status: 'falhou' })
          .eq('stripe_session_id', session.id)
          .neq('status', 'pago');
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
        if (pi) {
          await db
            .from('pagamentos_stripe')
            .update({ status: 'reembolsado' })
            .eq('stripe_payment_intent_id', pi);
        }
        break;
      }
      default:
        console.log('Evento ignorado:', event.type);
    }
  } catch (e) {
    console.error('Erro ao processar evento:', e);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
