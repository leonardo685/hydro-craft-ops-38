## Objetivo

Reformular o `CompararCotacaoModal` para que, depois de escolher o **vencedor**, apareça uma seção dedicada onde o usuário:

1. Preenche valores finais (unitário/total) e prazo de pagamento **só do vencedor**.
2. Pode **alterar, remover e adicionar** peças e usinagens compradas.
3. Cada alteração é **sincronizada automaticamente** com a `ordens_servico.pecas_necessarias` / `usinagem_necessaria` da OS vinculada (merge), para refletir no QR code e no histórico.

## Mudanças

### 1. `src/components/compras/CompararCotacaoModal.tsx`

**Manter:**
- Carregamento atual (`cotacoes`, `cotacao_itens`, `cotacao_fornecedores`, `cotacao_propostas`).
- Seletor "Vencedor" no topo (já existe).
- Tabela comparativa atual (visível enquanto não há vencedor, serve para comparar).

**Adicionar (renderizado APENAS quando `cotacao.vencedor_fornecedor_id` está definido):**

Uma seção destacada "Fechamento com [Fornecedor Vencedor]" contendo:

- **Prazo de pagamento (dias)**: input numérico ligado a `cotacao_fornecedores.prazo_pagamento_dias` do vencedor (salva on blur). Texto auxiliar: "Será usado no dashboard financeiro".
- **Lista editável de itens comprados** (uma linha por item):
  - Colunas: tipo (peça/usinagem), descrição, quantidade, valor unitário, total (auto), botão remover.
  - Cada item carrega `cotacao_item_id` + `ordem_servico_id` quando veio da cotação original.
  - Botões: **+ Adicionar peça** e **+ Adicionar usinagem** (no rodapé da lista). Quando há mais de uma OS vinculada, mostrar select de OS no item novo.
- **Total geral do fechamento** (soma dos itens × qtd).

**Fluxo de gravação (ao editar/adicionar/remover qualquer item da seção do vencedor):**

```text
debounce 400ms → salvar tudo de uma vez:
  1. Upsert em cotacao_propostas para o vencedor (preco_unitario, qtd derivada via cotacao_itens.quantidade).
  2. Para itens novos: insert em cotacao_itens (com ordem_servico_id) + cotacao_propostas.
  3. Para itens removidos: delete cotacao_propostas correspondente do vencedor
     (não apagar cotacao_itens — apenas marca que o vencedor não comprou).
  4. Reaplicar merge na OS (passo 2 abaixo).
```

### 2. Sincronização com a OS (merge)

Para cada `ordem_servico_id` envolvida na cotação (pode haver mais de uma):

```text
Ler ordens_servico atual (pecas_necessarias, usinagem_necessaria).
Conjunto "cotado" = descrições/itens originalmente da cotação para essa OS.
Conjunto "comprado" = itens atuais da seção do vencedor para essa OS.

Novo pecas_necessarias:
  = (itens existentes na OS que NÃO estão no conjunto "cotado")          ← preservados
  + (itens comprados do vencedor classificados como peça)                 ← sobrescritos
Novo usinagem_necessaria:
  = (itens existentes que NÃO estão no conjunto "cotado")
  + (itens comprados do vencedor classificados como usinagem)

Update ordens_servico set pecas_necessarias=..., usinagem_necessaria=... where id=ordem_id
```

Itens comprados levam `valor` (unitário) e `comprado: true` para refletir no `EditableItemsModal` e no PDF.

A diferenciação peça vs usinagem usa o campo `tipo` já existente em `cotacao_propostas`/`cotacao_itens` (atualmente "usinagem" marca usinagem; ausência = peça). Para itens novos, o botão usado define o tipo.

### 3. Sem mudanças de schema

- `cotacao_fornecedores.prazo_pagamento_dias` já existe.
- `cotacao_propostas.tipo`, `cotacao_itens.tipo` e `ordem_servico_id` já existem.
- Nada novo no banco. Os triggers de `ordens_servico` continuam registrando histórico das alterações automaticamente.

### 4. Feedback ao usuário

- Toast "Vencedor confirmado — ajuste valores abaixo" ao escolher vencedor.
- Toast "Sincronizado com OS MH-XXX-YY" após cada salvamento bem-sucedido.
- Toast de erro detalhado se o update da OS falhar (RLS/empresa_id), seguindo o padrão já adotado nos uploads.

## Fora do escopo

- Não muda a tabela comparativa (continua para suporte de decisão antes da escolha do vencedor).
- Não cria nova coluna; prazo de pagamento permanece em `cotacao_fornecedores`.
- Não altera Kanban de Compras (mas como ele lê `pecas_necessarias`, vai refletir as mudanças automaticamente).
- Não altera o PDF do `EditableItemsModal` — só passará a receber peças/usinagens já corretas.
