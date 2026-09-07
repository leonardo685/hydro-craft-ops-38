# Pagamento de orçamentos pelo cliente (Stripe, USD)

## O que você vai ter

- Em cada orçamento aprovado, um botão "Gerar link de pagamento".
- O cliente abre uma página de pagamento segura da Stripe e paga com cartão de crédito ou transferência bancária americana (ACH / wire).
- Assim que a Stripe confirma o pagamento, o sistema marca o orçamento como pago e cria automaticamente a entrada no financeiro (lançamento pago, com data e valor).
- Uma pequena área de "Pagamentos" no orçamento mostra o status: aguardando, pago, falhou ou reembolsado.
- O mesmo link pode ser enviado ao cliente junto com a proposta ou reaproveitado na página pública de acompanhamento.

## Como funciona a Stripe, em resumo

Você não guarda dados de cartão: a Stripe hospeda a tela de pagamento. Ela cobra por transação (nos EUA, cartão fica em torno de 2,9% + 30¢; transferência ACH é mais barata e leva alguns dias para confirmar). O dinheiro cai na conta bancária americana ligada à sua conta Stripe, normalmente em 2 dias úteis para cartão.

## Um ponto importante antes de começar

Este projeto usa um banco Supabase próprio seu, e não o backend gerenciado da Lovable. Por isso a integração de pagamentos "pronta" da Lovable não pode ser usada aqui: vamos conectar a **sua própria conta Stripe**, informando a chave secreta dela numa janela segura (a chave fica guardada no cofre de segredos, nunca no código). Você precisa de uma conta Stripe nos EUA; começamos em modo de teste, com cartões fictícios, antes de ativar cobranças reais.

## Etapas

1. Você cria (ou usa) a conta Stripe e me confirma; abro a janela segura para salvar a chave.
2. Nova tabela `pagamentos_stripe` para registrar cada tentativa de pagamento, ligada ao orçamento e à empresa.
3. Função no servidor que cria a sessão de pagamento da Stripe a partir do orçamento (valor, número, cliente, moeda USD).
4. Função no servidor que recebe a confirmação da Stripe (webhook), atualiza o pagamento, marca o orçamento e grava o lançamento financeiro pago.
5. Botão e área de status na tela de orçamentos, mais o link de pagamento na página pública.
6. Teste ponta a ponta em modo de teste: cartão aprovado, cartão recusado, e confirmação de que a baixa no financeiro aparece corretamente.

## Detalhes técnicos

- Tabela `pagamentos_stripe`: `id`, `empresa_id`, `orcamento_id`, `stripe_session_id`, `stripe_payment_intent_id`, `valor`, `moeda` (default `usd`), `status` (`pendente|pago|falhou|reembolsado`), `metodo`, `paid_at`, `created_at`. GRANTs para `authenticated`/`service_role` e RLS por `empresa_id` (leitura/escrita apenas da própria empresa); nenhuma política para `anon`.
- Edge function `criar-checkout-stripe` (`verify_jwt = false`, validação do JWT em código + checagem de que o orçamento pertence à empresa do usuário): cria `checkout.sessions` com `mode: 'payment'`, `payment_method_types: ['card', 'us_bank_account']`, `currency: 'usd'`, `client_reference_id` = `orcamento_id`, metadata com `empresa_id` e número do orçamento; grava a linha `pendente`.
- Edge function `stripe-webhook` (`verify_jwt = false`, assinatura verificada com `STRIPE_WEBHOOK_SECRET` e `constructEventAsync`): trata `checkout.session.completed`, `checkout.session.async_payment_succeeded/failed` (necessário para ACH) e `charge.refunded`. Usa service role para atualizar `pagamentos_stripe`, setar `orcamentos.status`/`data_pagamento` e inserir em `lancamentos_financeiros` (`tipo: 'entrada'`, `pago: true`, `data_realizada` = data da confirmação, `fornecedor_cliente` = cliente do orçamento, `conta_bancaria` = conta Stripe configurável). Idempotência via `stripe_session_id` único.
- Segredos: `STRIPE_SECRET_KEY` (via integração Stripe) e `STRIPE_WEBHOOK_SECRET` (você gera no painel Stripe e cola no cofre depois que a função estiver publicada).
- Frontend: `src/pages/Orcamentos.tsx` ganha o botão + badge de status; hook `use-pagamentos-stripe` para consultar; link também exposto em `RastreamentoPublico`. Valores em USD já se encaixam na exibição atual com `$`.
