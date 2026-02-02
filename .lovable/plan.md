
# Plano: Funcionalidade "Solver" para Identificar Lançamentos por Valor Total

## Objetivo

Criar uma funcionalidade que permite ao usuário inserir um valor recebido (geralmente um pagamento que engloba múltiplas notas) e o sistema identifica automaticamente quais lançamentos pendentes ou atrasados combinados resultam nesse valor.

## Cenário de Uso

Quando um cliente paga várias notas de uma só vez com um único depósito, o usuário precisa descobrir quais notas específicas foram pagas. O "Solver" encontra a combinação exata de lançamentos que totaliza o valor recebido.

## Solução Proposta

### Componentes a Criar

1. **Modal SolverLancamentosModal**: Nova janela para a funcionalidade
   - Seleção de tipo: Entrada ou Saída
   - Campo para inserir o valor alvo
   - Lista de resultados com lançamentos que combinam para formar o valor
   - Botão para marcar todos como pagos de uma vez

### Fluxo do Usuário

1. Clica no botão "Solver" na aba Extrato
2. Seleciona se é uma Entrada ou Saída
3. Digita o valor total recebido (ex: R$ 15.000,00)
4. Sistema busca todos os lançamentos do tipo selecionado que NÃO estão pagos
5. Executa algoritmo de combinação para encontrar quais lançamentos somam exatamente o valor
6. Exibe as combinações encontradas
7. Usuário pode marcar todos os lançamentos da combinação como pagos

## Arquivos a Criar

### `src/components/SolverLancamentosModal.tsx`

Novo componente modal com:
- Select para tipo (entrada/saída)
- Input numérico para valor alvo
- Botão "Buscar Combinação"
- Tabela com resultados mostrando:
  - Checkbox para seleção
  - Descrição do lançamento
  - Fornecedor/Cliente
  - Valor
  - Data Esperada
  - Status (No Prazo/Atrasado)
- Total selecionado em tempo real
- Botão "Marcar como Pago" para os itens selecionados

## Arquivos a Modificar

### `src/pages/DFC.tsx`

1. Importar o novo componente `SolverLancamentosModal`
2. Adicionar estado para controlar abertura do modal: `isSolverModalOpen`
3. Adicionar botão "Solver" ao lado do botão "Novo Lançamento" na aba Extrato
4. Passar props necessárias para o modal (lançamentos, função de atualização)

## Algoritmo de Combinação

O algoritmo busca subconjuntos de lançamentos que somam exatamente o valor alvo:

1. Filtra lançamentos do tipo selecionado que NÃO estão pagos
2. Ordena por valor (descendente) para otimização
3. Usa busca recursiva com tolerância de R$ 0,01 para arredondamentos
4. Limita resultados às primeiras 5 combinações encontradas (performance)
5. Prioriza combinações com menos lançamentos

## Detalhes Técnicos

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `SolverLancamentosModal.tsx` | Novo | Modal completo da funcionalidade |
| `DFC.tsx` | Modificar | Adicionar botão e integração |

### Interface do Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Solver - Identificar Lançamentos                      [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tipo: [Entrada ▼]    Valor Alvo: [R$ ________]  [Buscar]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Combinação Encontrada:                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [✓] NF 1234 - Cliente ABC     R$ 5.000,00   01/01/2026 ││
│  │ [✓] NF 1235 - Cliente ABC     R$ 7.500,00   15/01/2026 ││
│  │ [✓] NF 1236 - Cliente ABC     R$ 2.500,00   20/01/2026 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Total Selecionado: R$ 15.000,00                           │
│                                                             │
│              [Cancelar]  [Marcar Selecionados como Pagos]  │
└─────────────────────────────────────────────────────────────┘
```

### Ícone do Botão

Usará o ícone `Calculator` do lucide-react com texto "Solver"

## Considerações de Performance

- Limitar busca a 100 lançamentos pendentes por vez
- Interromper busca após encontrar 5 combinações válidas
- Timeout de 3 segundos para evitar travamentos em datasets grandes
