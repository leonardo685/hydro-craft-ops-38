

# Correcao: Item com quantidade > 1 gera apenas 1 ordem

## Problema

Quando a NFe tem um item com `quantidade: 12`, a API retorna um unico elemento no array `itens` com `quantidade: 12`. O sistema cria 1 ordem por elemento do array, resultando em apenas 1 ordem ao inves de 12.

## Solucao

Expandir os itens da NFe ao recebe-los da API: cada unidade de quantidade vira um item individual na lista. Assim, um item com quantidade 12 gera 12 linhas no modal de selecao, cada uma representando 1 unidade.

## Alteracao

### Arquivo: `src/lib/nfe-utils.ts`

Na funcao `extrairDadosNFe`, apos mapear os itens da API (linha ~179), expandir cada item com `quantidade > 1` em N itens individuais:

```typescript
// Antes (linha 179-187):
itens: dados.itens?.map((item: any) => ({
  codigo: item.codigo,
  descricao: item.descricao,
  ncm: item.ncm || '',
  quantidade: item.quantidade,
  valorUnitario: item.valor_unitario,
  valorTotal: item.valor_total,
  unidade: 'UN'
})) || []

// Depois:
itens: dados.itens?.flatMap((item: any) => {
  const qty = Math.max(1, Math.floor(item.quantidade || 1));
  return Array.from({ length: qty }, (_, i) => ({
    codigo: item.codigo,
    descricao: item.descricao,
    ncm: item.ncm || '',
    quantidade: 1,
    valorUnitario: item.valor_unitario,
    valorTotal: item.valor_unitario, // cada unidade tem valor = unitario
    unidade: 'UN'
  }));
}) || []
```

Isso garante que:
- Um item com quantidade 12 aparece como 12 linhas no modal `ItensNFeModal`
- Cada linha representa 1 unidade com `valorTotal = valorUnitario`
- O matching de ordens existentes continua funcionando (mesmo codigo + valor unitario)
- O usuario pode selecionar quantas ordens quiser criar (ate 12 neste caso)

Nenhuma outra alteracao necessaria -- o `ItensNFeModal` e o `ChaveAcessoModal` ja tratam cada elemento do array como uma ordem individual.
