# Rastreamento público do serviço via QR Code

Cada recebimento passa a ter um QR Code enviável ao cliente. Ao ler o QR, o cliente vê o andamento do serviço (estilo rastreio de entrega). Quando a ordem é finalizada, o mesmo QR passa a levar ao laudo e histórico de manutenção, e o rastreamento deixa de aparecer.

## Fluxo do cliente

1. Lê o QR (link `/ordem/MH-XXX-YY`, o mesmo formato já usado hoje).
2. Preenche o formulário de acesso (telefone; na primeira vez também nome e empresa) — idêntico ao do laudo.
3. Se a ordem **não** está finalizada: abre a página de **Rastreamento**.
4. Se a ordem **já** está finalizada (tem laudo/fotos/nota de retorno): abre o **Laudo público** com histórico de manutenção, como hoje.

## Etapas do rastreamento

```text
[1] Equipamento recebido      -> recebimento criado
[2] Equipamento dimensionado  -> ordem de serviço/análise criada
[3] Aguardando aprovação      -> orçamento emitido, aguardando cliente
[4] Equipamento em produção   -> ordem aprovada / em produção
```

A etapa atual é derivada dos dados que já existem (recebimento, ordem de serviço, orçamento e status da ordem) — nada precisa ser marcado manualmente. Cada etapa concluída mostra a data. A página exibe também identificação do equipamento, número da ordem, cliente e logo da empresa, e respeita o seletor de idioma (PT/EN/ES) como o laudo.

## Envio do QR Code por e-mail

Na tela de Recebimentos (e no detalhe do recebimento), um botão "Enviar QR ao cliente" abre um modal com:

- E-mails já cadastrados do cliente (campo principal + e-mails adicionais), pré-selecionados via checkbox.
- Campo para digitar um e-mail novo.
- Prévia do QR Code e botão para baixar o PNG, caso queira enviar manualmente.

O envio é feito por uma função de servidor que gera o e-mail com o QR Code e o link de rastreamento. Para isso é necessário cadastrar uma chave de API de envio de e-mail (Resend) e um domínio remetente verificado — vou pedir a chave no momento da implementação.

## Detalhes técnicos

- Nova rota pública `/rastreamento/:numeroOrdem` (fora do AuthProvider), nova página `src/pages/RastreamentoPublico.tsx`, usando `supabasePublico` com o header `x-ordem-numero`.
- `OrdemPorQRCode.tsx`: hoje redireciona para `/` quando não há laudo. Passa a redirecionar para `/acesso-ordem/:numeroOrdem?destino=rastreamento`; `AcessoOrdemPublica.tsx` deixa de exigir ordem finalizada e, após validar o telefone, envia para o laudo ou para o rastreamento conforme o estado.
- O QR aponta para o número da ordem do recebimento; quando ainda não existe ordem de serviço, a consulta pública é resolvida por número de recebimento.
- Políticas de RLS: novas policies de leitura pública (via `ordem_publica_numero()`) restritas aos campos necessários de `recebimentos`, `ordens_servico` e `orcamentos` (número, datas, status) — sem expor valores financeiros. Serão feitas por migração e revisadas no scanner de segurança.
- Edge function `enviar-qrcode-cliente`: recebe número da ordem + lista de e-mails, gera o link, monta o HTML com o QR embutido e envia via Resend. Registro do envio na tabela de atividades.
- Componente reutilizável `QRCodeRecebimentoModal` (usa `qrcode`, já instalado) para prévia, download e envio.
- Traduções novas em `src/i18n/translations.ts` e termos dinâmicos em `dynamicTerms.ts`.
