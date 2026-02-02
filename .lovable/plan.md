
# Correção: Problema de Precisão Decimal no Solver

## Problema Identificado

O algoritmo de soma no Solver está usando operações de ponto flutuante diretas, o que causa imprecisões com valores decimais (centavos). Em JavaScript:
- `0.1 + 0.2 = 0.30000000000000004` (não 0.3)
- Somas acumulativas amplificam esse erro

## Solução

Converter todos os valores para **centavos (inteiros)** durante o cálculo e reconverter para reais apenas na exibição. Isso elimina completamente os problemas de precisão com ponto flutuante.

## Arquivo a Modificar

### `src/components/SolverLancamentosModal.tsx`

### Mudanças:

1. **Converter valor alvo para centavos** (linha 62):
```typescript
const valorNumerico = Math.round(parseFloat(valorAlvo.replace(",", ".")) * 100);
```

2. **Criar valores em centavos para os lançamentos** (linha 81-83):
```typescript
const lancamentosParaBusca = lancamentosPendentes
  .slice(0, maxLancamentos)
  .map(l => ({ ...l, valorCentavos: Math.round(l.valor * 100) }))
  .sort((a, b) => b.valorCentavos - a.valorCentavos);
```

3. **Ajustar tolerância para centavos** (linha 76):
```typescript
const tolerancia = 1; // 1 centavo de tolerância
```

4. **Comparar usando valores inteiros no algoritmo de busca** (linhas 86-118):
- Usar `lancamento.valorCentavos` nas somas
- Comparar `somaAtual` com `valorNumerico` em centavos

5. **Calcular total em centavos e reconverter** (linha 94-96):
```typescript
total: somaAtual / 100, // Reconverter para reais
```

6. **Corrigir cálculo do totalSelecionado** (linha 169-173):
```typescript
const totalSelecionado = useMemo(() => {
  const totalCentavos = lancamentos
    .filter((l) => itensSelecionados.has(l.id))
    .reduce((acc, l) => acc + Math.round(l.valor * 100), 0);
  return totalCentavos / 100;
}, [lancamentos, itensSelecionados]);
```

## Lógica da Correção

| Antes (incorreto) | Depois (correto) |
|-------------------|------------------|
| `15000.50 + 2500.25` = possível erro | `1500050 + 250025` = 1750075 centavos |
| Tolerância: 0.01 (reais) | Tolerância: 1 (centavo) |
| Somas com ponto flutuante | Somas com inteiros |

## Resultado Esperado

- Valores como R$ 1.234,56 + R$ 789,44 = R$ 2.024,00 serão calculados corretamente
- Não haverá mais erros de arredondamento com centavos
- A tolerância de 1 centavo continua funcionando para pequenas diferenças
