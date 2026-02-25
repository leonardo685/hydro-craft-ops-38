
# Correcao: Percentuais customizados nao aparecem no PDF de Precificacao

## Problema

O modal de precificacao permite adicionar **percentuais customizados** (campo `percentuais_customizados`), mas a funcao `gerarPDFPrecificacao` em `src/lib/precificacao-utils.ts` so renderiza:
- Impostos
- Comissao
- Custos Variaveis

Os percentuais customizados sao passados nos dados (`dadosAtualizados.percentuais_customizados`) mas **nunca sao lidos nem exibidos** no PDF.

## Solucao

Adicionar uma secao no PDF para renderizar os percentuais customizados, entre a comissao e os custos variaveis.

## Alteracao

### Arquivo: `src/lib/precificacao-utils.ts`

Apos a secao de "Comissao" (linha 111), adicionar renderizacao dos percentuais customizados:

```typescript
// Percentuais Customizados
const percentuaisCustomizados: CustoVariavel[] = orcamento.percentuais_customizados || [];
if (percentuaisCustomizados.length > 0) {
  doc.setFont("helvetica", "bold");
  doc.text("Outros Percentuais:", 25, yPosition);
  yPosition += 8;
  doc.setFont("helvetica", "normal");

  percentuaisCustomizados.forEach((item) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    const valorCalculado = (precoDesejado * Number(item.valor)) / 100;
    doc.text(`- ${item.descricao}`, 30, yPosition);
    doc.text(`${formatarPercentual(Number(item.valor))}`, 100, yPosition);
    doc.text(`${formatarMoeda(valorCalculado)}`, pageWidth - 50, yPosition, { align: "right" });
    yPosition += 7;
  });
  yPosition += 5;
}
```

Tambem atualizar o calculo de `totalCustos` (linha 134) para incluir os valores dos percentuais customizados, mantendo consistencia com o modal:

```typescript
// Antes:
const totalCustos = impostosValor + comissaoValor + (orcamento.total_custos_variaveis || 0);

// Depois:
const totalPercentuaisCustomizados = percentuaisCustomizados.reduce(
  (acc, item) => acc + (precoDesejado * Number(item.valor)) / 100, 0
);
const totalCustos = impostosValor + comissaoValor + totalPercentuaisCustomizados + (orcamento.total_custos_variaveis || 0);
```

Nenhuma outra alteracao necessaria -- o modal ja passa os dados corretamente.
