## Objetivo
Adicionar um botão de atualização (refresh) em todas as páginas/aba financeiras para recarregar os dados das tabelas sem perder os filtros aplicados.

## Páginas afetadas
- Financeiro
- DFC
- DRE
- Meta de Gastos
- Histórico de Lançamentos

## Como funciona hoje
Todos os hooks financeiros já expõem uma função `refetch`:
- `useLancamentosFinanceiros` → `refetch`
- `useMetasGastos` → `refetch`
- `useCategoriasFinanceiras` → `refetch`
- `useHistoricoLancamentos` → usa `useQuery` do TanStack, precisa retornar `refetch`

## Implementação

1. **Ajustar `useHistoricoLancamentos`**
   - Retornar a função `refetch` do `useQuery` para permitir atualização manual.

2. **Adicionar botão de atualização em cada página**
   - Colocar um botão com ícone `RefreshCw` ao lado do título da página (ou no header do card de filtros).
   - Ao clicar, chamar `refetch()` do(s) hook(s) correspondente(s).
   - O botão mostra estado de carregamento (`isRefetching`) enquanto os dados são buscados.

3. **Páginas e hooks de refresh**

   | Página | Hook(s) a atualizar |
   |--------|---------------------|
   | Financeiro | `useLancamentosFinanceiros().refetch` |
   | DFC | `useLancamentosFinanceiros().refetch` |
   | DRE | `useLancamentosFinanceiros().refetch` |
   | MetaGastos | `useMetasGastos().refetch` + `useLancamentosFinanceiros().refetch` |
   | HistoricoLancamentos | `useHistoricoLancamentos().refetch` |

4. **Comportamento**
   - Apenas recarrega os dados do backend.
   - Não reseta nenhum estado de filtro, ordenação, busca ou aba ativa.
   - O botão gira durante o carregamento.

## Resultado esperado
O usuário pode, a qualquer momento, clicar em "Atualizar" para ver os dados mais recentes do banco sem perder sua configuração de filtros atual.