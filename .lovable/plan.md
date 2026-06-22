## Ocultar usinagens da seção de fechamento

Na seção "Fechamento" do `CompararCotacaoModal.tsx`, exibir apenas itens do tipo **peça**. Usinagens não aparecerão na lista editável nem no botão de adicionar.

### Mudanças

1. **Lista de itens do fechamento**: filtrar para mostrar apenas itens cujo `tipo !== 'usinagem'` (peças). Usinagens ficam ocultas no UI mas permanecem intactas em `cotacao_propostas` / `cotacao_itens` e na sincronização com a OS (não são apagadas).
2. **Botão "Adicionar"**: remover a opção de adicionar usinagem; manter apenas "Adicionar peça".
3. **Total do fechamento**: continuar somando somente o que está visível (peças).
4. **Sincronização com a OS**: inalterada — usinagens vindas da cotação continuam sendo mescladas em `usinagem_necessaria` normalmente; o filtro é apenas visual.

### Fora de escopo
- Tabela comparativa (continua mostrando tudo).
- Schema / triggers / PDF / Kanban.
