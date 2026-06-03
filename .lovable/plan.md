## Módulo Compras — Reestruturação

Transformar a página atual (`src/pages/Compras.tsx`) em um módulo com 3 abas: **Dashboard**, **Kanban** e **Cotações**. Mantém o Kanban atual intacto e adiciona inteligência de compras em volta dele.

---

### Aba 1 — Dashboard

KPIs no topo (cards):
- Total comprado no mês / acumulado ano
- Ticket médio por pedido de compra
- Nº de ordens com compras abertas (aprovado + cotando)
- **Prazo médio negociado (DPO)** — média ponderada do campo `prazo_pagamento_dias` dos pedidos de compra no período (não usa data de pagamento real)
- % de compras com cotação formal antes da emissão

Gráficos:
- Barras: gasto mensal últimos 6 meses
- Pizza: top 5 fornecedores no período
- Pizza: gasto por categoria de item (peça / usinagem / serviço)
- Linha: evolução do prazo médio negociado mês a mês
- Tabela: top 10 itens mais comprados (qtd + R$)

Filtros: período, fornecedor, categoria.

---

### Aba 2 — Kanban (atual)

Mantém exatamente como está hoje: Aprovado → Cotando → Comprado, com busca por número, modais de itens, etc. Apenas movido para dentro da `Tabs`.

---

### Aba 3 — Cotações & Fornecedores

Processo de RFQ (Request for Quote):

1. Botão "Nova Cotação" na coluna **Cotando** do Kanban (ou direto na aba).
2. Selecionar itens de **uma ou mais ordens aprovadas** (já existe `EditableItemsModal`/`ItemSelectionModal` para reaproveitar).
3. **Selecionar fornecedores** (multi-select) a partir da tabela `fornecedores` já cadastrada — sem cadastro novo, apenas filtrar/buscar nos existentes.
4. Disparar via n8n (mesmo padrão de webhook dos orçamentos) → e-mail / WhatsApp com lista de itens + link público com token.
5. Fornecedor responde via link público (sem login): preço por item, prazo de entrega, validade da proposta.
6. Tela de **comparativo**: matriz item × fornecedor, melhor preço destacado, possibilidade de aprovar fornecedor diferente por item.
7. Ao aprovar → cria registro em `pedidos_compra` com `prazo_pagamento_dias` (ex: 28 ddl) preenchido a partir do que foi negociado com o fornecedor, e move a `compra` para status `comprado` no Kanban.

Aprimoramentos em **fornecedores** (sem criar nova entidade — estender a existente):
- Adicionar colunas: `whatsapp`, `email_cotacao`, `prazo_pagamento_padrao_dias` (default usado na cotação, ex: 28), `rating` (1-5), `categorias` (text[] — peças, usinagem, serviços).
- Histórico do último preço cobrado por item (tabela `fornecedor_itens_historico`).
- Sugestão automática de fornecedores na nova cotação baseada em categoria do item + rating + histórico de resposta.

---

### Mudanças de schema (migrations)

```sql
-- Estender fornecedores
ALTER TABLE fornecedores
  ADD COLUMN whatsapp text,
  ADD COLUMN email_cotacao text,
  ADD COLUMN prazo_pagamento_padrao_dias int DEFAULT 28,
  ADD COLUMN rating smallint,
  ADD COLUMN categorias text[] DEFAULT '{}';

-- Novas tabelas (com GRANTs + RLS por empresa_id)
cotacoes (id, numero, empresa_id, status, criado_por, created_at, observacoes)
cotacao_itens (id, cotacao_id, ordem_servico_id, tipo, descricao, quantidade, unidade)
cotacao_fornecedores (id, cotacao_id, fornecedor_id, token_publico, enviado_em, respondido_em)
cotacao_propostas (id, cotacao_fornecedor_id, cotacao_item_id, preco_unitario, prazo_entrega_dias, observacao)
pedidos_compra (id, empresa_id, cotacao_id, fornecedor_id, numero, valor_total, prazo_pagamento_dias, data_compra, status)
pedido_compra_itens (id, pedido_compra_id, cotacao_item_id, preco_unitario, quantidade)
fornecedor_itens_historico (id, fornecedor_id, descricao_item, ultimo_preco, ultima_data)
```

Todas com `empresa_id`, RLS via `user_belongs_to_empresa`, e GRANTs para `authenticated` + `service_role`. Tabela `cotacao_fornecedores` precisa policy adicional para leitura pública via `token_publico` (página pública de resposta).

DPO calculado direto de `pedidos_compra.prazo_pagamento_dias` ponderado por `valor_total` — sem depender de `lancamentos_financeiros`.

---

### Webhooks n8n (mesmo padrão dos orçamentos)

Eventos:
- `cotacao.criada` → dispara e-mail/WhatsApp para fornecedores selecionados
- `cotacao.lembrete` → 48h sem resposta
- `cotacao.respondida` → notifica comprador
- `pedido_compra.aprovado` → confirmação ao fornecedor

URLs configuráveis em `configuracoes_sistema`.

---

### Fases sugeridas

**Fase 1 (esta entrega):** Aba Dashboard + aba Kanban (movido) + estender `fornecedores` com os campos novos.
**Fase 2:** Tabelas de cotação + tela de RFQ + link público + comparativo.
**Fase 3:** `pedidos_compra` formal + webhooks n8n + integração com Financeiro (gera `lancamentos_financeiros` automático na data esperada = `data_compra + prazo_pagamento_dias`).

---

### Confirmações antes de codar

1. Começo pela **Fase 1** apenas (Dashboard + Kanban em tabs + campos extras em fornecedores) ou já encarar Fase 1 + 2 juntas?
2. O webhook do n8n para cotações pode reaproveitar `configuracoes_sistema` (mesmo padrão de `webhook_aprovacao_orcamento`) — ok?
3. Link público de resposta do fornecedor: **sem login, com token** (estilo magic-link) — confirma?
