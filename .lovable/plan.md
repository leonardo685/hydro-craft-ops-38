## Objetivo
Em "Novo Orçamento", permitir esconder as seções de **Peças**, **Serviços** e **Usinagem** individualmente, para clientes que preferem orçamento sem essas seções detalhadas.

## Mudanças

### `src/pages/NovoOrcamento.tsx`
1. Expandir o estado `informacoesComerciais` (hoje já tem `mostrarPecas`) para incluir:
   - `mostrarPecas: boolean` (já existe)
   - `mostrarServicos: boolean` (novo, default `true`)
   - `mostrarUsinagem: boolean` (novo, default `true`)

2. Acima de cada uma das três seções (Peças, Serviços, Usinagem) no formulário, adicionar um **Switch** ("Mostrar no orçamento") que controla a renderização do conteúdo da seção. Quando desligado:
   - O conteúdo da seção (tabela + botões de adicionar item) fica oculto
   - Os itens já cadastrados são preservados no estado (não apagar) — apenas escondidos
   - Cabeçalho da seção continua visível para o usuário poder reativar

3. Persistir as três flags ao salvar (mesmo local onde `mostrarPecas` já é salvo, em `observacoes` ou colunas existentes — manter padrão atual).

4. No PDF (`jsPDF`), respeitar as três flags: pular as seções desativadas e não somar seus valores na exibição (mas o valor total comercial continua refletindo o que o usuário definiu manualmente).

### Carregamento na edição
Ao carregar um orçamento existente, ler as três flags do registro salvo (se ausentes, default `true` para retrocompatibilidade).

## Fora do escopo
- Não muda lógica de cálculo automático do total
- Não muda Kanban de Compras nem Cotações
- Não cria novas colunas no banco — reutiliza armazenamento atual de `mostrarPecas`