## Objetivo
Na empresa americana (idioma en/US), cada orçamento/invoice deve ter um link de pagamento Stripe (cartão de crédito + transferência bancária ACH). Cliente clica em "Pay now" e paga aquela invoice específica.

## Passos

### 1. Habilitar Stripe Payments (built-in)
- Rodar `recommend_payment_provider` e depois `enable_stripe_payments`.
- Depois disso, o Stripe fica disponível sem BYOK. Vou usar tax handling apropriado para serviços americanos.

### 2. Schema
Nova migração criando:
- Coluna `stripe_payment_link_url text`, `stripe_session_id text`, `stripe_payment_status text` (`pending` | `paid` | `failed`), `stripe_paid_at timestamptz` em `orcamentos`.
- GRANTs mantidos conforme padrão multi-tenant.

### 3. Edge function `create-invoice-payment`
- Recebe `orcamento_id`.
- Valida sessão, empresa e que o orçamento pertence ao usuário.
- Cria um Stripe Checkout Session em modo `payment` com:
  - `payment_method_types: ['card', 'us_bank_account']` (ACH)
  - `line_items` com valor total do orçamento em USD
  - `metadata.orcamento_id`
  - `success_url` / `cancel_url` apontando para o app
- Salva `stripe_session_id` e `stripe_payment_link_url` (session.url) no orçamento.
- Retorna a URL.

### 4. Edge function `stripe-webhook` (public, verify_jwt=false)
- Ouve `checkout.session.completed` e `checkout.session.async_payment_succeeded` (ACH liquida depois).
- Atualiza orçamento: `stripe_payment_status='paid'`, `stripe_paid_at=now()`.
- Também `async_payment_failed` → `failed`.
- Requer secret `STRIPE_WEBHOOK_SECRET` (o usuário cadastra depois no dashboard Stripe copiando a URL da function).

### 5. UI (somente empresa americana)
Detecção: já existe lógica de idioma em `LanguageContext` baseada no nome da empresa. Vou reusar (`language === 'en'` ou nome empresa contém "USA"/similar — confirmar código atual).

Em `NovoOrcamento.tsx` (tela de edição/visualização do orçamento):
- Se empresa americana e orçamento salvo: botão **"Generate payment link"**. Ao clicar chama a edge function e mostra a URL + botão copiar + status.
- Se já pago: badge "Paid on {data}".
- No PDF da invoice: incluir a URL como link "Pay this invoice online" quando existir.

Nada de UI para empresas não-americanas.

### 6. Fluxo do usuário final
1. Cria/edita orçamento em USD na empresa americana.
2. Clica "Generate payment link" → recebe URL Stripe hospedada.
3. Envia PDF/link ao cliente.
4. Cliente paga com cartão ou ACH na página Stripe.
5. Webhook marca a invoice como paga automaticamente.

## Detalhes técnicos
- Stripe SDK via `npm:stripe@17` no Deno.
- Uso de `Deno.env.get('STRIPE_SECRET_KEY')` (setado automaticamente pelo `enable_stripe_payments`).
- Webhook URL: `https://<project>.supabase.co/functions/v1/stripe-webhook` — usuário adiciona no dashboard Stripe e cola o signing secret via `add_secret('STRIPE_WEBHOOK_SECRET')`.
- Currency fixa `usd` para empresa americana.

## Fora do escopo
- Cobrança recorrente/assinaturas.
- Múltiplas moedas por orçamento.
- Divisão de pagamento em parcelas.
