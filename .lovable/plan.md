## Mudanças em `src/components/compras/CompararCotacaoModal.tsx`

1. **Remover o botão "Sincronizar OS"** (linhas 514-516) do cabeçalho do bloco "Fechamento com vencedor".
   - A sincronização já roda automaticamente em todos os pontos de edição (`atualizarItemFechamento`, `salvarPrecoVencedor`, `adicionarItemFechamento`, `removerItemFechamento`), então nenhuma ação manual é necessária.
   - Atualizar o texto auxiliar para deixar claro que as alterações refletem na OS em tempo real.

2. **Adicionar botão "Finalizar compra"** ao lado de "Adicionar usinagem" (linhas 612-619).
   - Estilo destacado (`variant="default"`, ícone `CheckCircle2`).
   - Ao clicar:
     a. Garante uma sincronização final chamando `sincronizarTodasOS()` (idempotente, cobre o caso de algo não ter blurrado).
     b. Para cada `ordem_servico_id` distinto presente em `itens`, faz `update` em `public.compras` setando `status = 'comprado'` e `data_compra = now()` (mesma transição usada no Kanban).
     c. Marca a cotação como finalizada: `update cotacoes set status = 'finalizada' where id = cotacaoId`.
     d. Toast de sucesso, `onOpenChange(false)` e callback `onUpdated?.()` para atualizar a lista de cotações.
   - Botão desabilitado enquanto roda (estado `finalizando`) para evitar duplo clique.

3. **Garantir auto-sync ao criar usinagem**: `adicionarItemFechamento("usinagem")` já chama `carregar()`; adicionar `await sincronizarTodasOS()` ao final para que a nova usinagem apareça imediatamente na OS sem precisar editar nada (hoje só sincroniza ao alterar quantidade/preço/descrição).

Sem mudanças de schema, sem mudanças em outros arquivos.