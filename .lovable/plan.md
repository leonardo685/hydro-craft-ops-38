
# Plano: Exibir Número do Pedido nos Orçamentos Finalizados

## Problema Identificado

Na aba "Finalizados" da página de Orçamentos, o número do pedido do cliente não está sendo exibido. Conforme a imagem de referência, o usuário deseja ver essa informação junto com os outros dados já exibidos (NF, Data Aprovação, etc.).

## Análise Técnica

O número do pedido é salvo dentro do campo `descricao` da tabela `orcamentos` quando o orçamento é aprovado. O formato é:

```
Detalhes da Aprovação:
- Valor Original: R$ X.XXX,XX
- Desconto: X%
- Valor Final: R$ X.XXX,XX
- Prazo de Pagamento: XX dias
- Data de Vencimento: DD/MM/YYYY
- Número do Pedido: XXXXXXX
```

## Solução

1. Criar uma função utilitária para extrair o número do pedido do campo `descricao`
2. Adicionar a exibição do número do pedido no card de orçamentos finalizados

## Arquivo a Modificar

### `src/pages/Orcamentos.tsx`

**Mudanças:**

1. Adicionar função para extrair número do pedido:
```typescript
const extrairNumeroPedido = (descricao: string | null): string | null => {
  if (!descricao) return null;
  const match = descricao.match(/- Número do Pedido:\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : null;
};
```

2. Na seção `TabsContent value="finalizado"`, adicionar exibição após os campos existentes (cliente, equipamento, valor, NF):

```tsx
{extrairNumeroPedido(item.descricao) && (
  <p>
    <span className="font-medium">Nº Pedido:</span> {extrairNumeroPedido(item.descricao)}
  </p>
)}
```

## Detalhes da Implementação

| Localização | Mudança |
|-------------|---------|
| Linhas 2239-2251 | Adicionar linha para número do pedido entre os dados exibidos |
| Início do arquivo | Adicionar função utilitária `extrairNumeroPedido` |

## Resultado Esperado

Nos cards de orçamentos finalizados, aparecerá:
- Cliente: NOME DO CLIENTE
- Equipamento: DESCRIÇÃO
- Valor: R$ X.XXX,XX
- **Nº Pedido: XXXXXXX** ← Novo campo
- NF: XXX
- Data Aprovação: DD/MM/YYYY
