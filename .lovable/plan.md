

# Análise: Lançamento da Prysmian não aparece ao filtrar por "Realizados"

## Problema Identificado

O lançamento da **PRYSMIAN CABOS** tem datas diferentes:
- **Data Esperada**: 11/02/2026
- **Data Realizada**: 09/02/2026

Quando o filtro "Tipo de Data" é alterado para **"Realizada"**, o sistema passa a usar a `dataRealizada` (09/02) para filtrar pelo período. Se o intervalo de datas selecionado cobre apenas a partir de 11/02 (ou outro range que não inclua 09/02), o lançamento da Prysmian é excluído.

Além disso, existe um **bug secundário**: quando `tipoData` = `'realizada'` e um lançamento **não tem** `dataRealizada` (é null), o código cria `new Date(null)` que retorna 01/01/1970, fazendo com que lançamentos sem data realizada sejam sempre excluídos silenciosamente do filtro de datas.

## Solução Proposta

Corrigir a lógica de filtro de datas no extrato para:

1. Quando `tipoData = 'realizada'` e o lançamento não tem `dataRealizada`, usar a `dataEsperada` como **fallback** (para não excluir silenciosamente lançamentos pendentes)
2. Alternativamente, se o objetivo é mostrar **apenas lançamentos com data realizada preenchida** quando esse filtro está ativo, pular o filtro de data para itens sem `dataRealizada` em vez de excluí-los com uma data de 1970

## Alteração Técnica

### Arquivo: `src/pages/DFC.tsx`

Na função `extratoFiltrado` (linhas 569-587), adicionar verificação de null para `dataRealizada`:

```typescript
// Filtro de data início
if (filtrosExtrato.dataInicio) {
  const dataInicio = new Date(filtrosExtrato.dataInicio);
  dataInicio.setHours(0, 0, 0, 0);
  const campoData = filtrosExtrato.tipoData === 'esperada' 
    ? item.dataEsperada 
    : (item.dataRealizada || item.dataEsperada); // fallback para dataEsperada
  const dataItem = new Date(campoData);
  dataItem.setHours(0, 0, 0, 0);
  if (dataItem < dataInicio) return false;
}

// Filtro de data fim
if (filtrosExtrato.dataFim) {
  const dataFim = new Date(filtrosExtrato.dataFim);
  dataFim.setHours(23, 59, 59, 999);
  const campoData = filtrosExtrato.tipoData === 'esperada' 
    ? item.dataEsperada 
    : (item.dataRealizada || item.dataEsperada); // fallback para dataEsperada
  const dataItem = new Date(campoData);
  dataItem.setHours(0, 0, 0, 0);
  if (dataItem > dataFim) return false;
}
```

Isso garante que:
- Lançamentos pagos com `dataRealizada` diferente da `dataEsperada` sejam filtrados pela data correta
- Lançamentos sem `dataRealizada` usem a `dataEsperada` como fallback em vez de serem excluídos por uma data inválida (1970)
