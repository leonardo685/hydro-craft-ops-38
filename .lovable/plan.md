

# Plano: Mover Gráfico de Motivos de Falha para Histórico de Manutenções

## Resumo

Vou remover o gráfico de radar "Motivos de Falha" do Dashboard financeiro e integrá-lo no modal de **Histórico de Manutenção**, onde ele será mais relevante para análise de equipamentos.

---

## Mudanças a Realizar

### 1. Remover do Dashboard

Vou remover a importação e o uso do `FailureReasonChart` da página `Dashboard.tsx`:

- **Linha 25**: Remover import do `FailureReasonChart`
- **Linha 841-842**: Remover o componente do grid e ajustar layout de `md:grid-cols-3` para `md:grid-cols-2`

### 2. Integrar no Modal de Histórico de Manutenção

Vou adicionar o gráfico de radar no modal `HistoricoManutencaoModal.tsx`:

- Adicionar import do `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` e componentes do `recharts` para RadarChart
- O gráfico vai aparecer após os cards de resumo e antes do gráfico de tendência
- O gráfico vai agregar os motivos de falha das ordens encontradas na pesquisa do histórico

### 3. Adaptar o Componente para Contexto do Modal

O gráfico atual busca dados de toda a empresa. Para o modal de histórico, vou:

- Utilizar os dados já carregados do `historico` (array de manutenções)
- Agregar os `motivo_falha` das ordens no histórico pesquisado
- Exibir a distribuição específica do equipamento/cliente consultado

---

## Seção Técnica

### Alterações no Dashboard.tsx:

```tsx
// REMOVER linha 25:
import { FailureReasonChart } from "@/components/FailureReasonChart";

// MODIFICAR linha 841 - grid de 3 para 2 colunas:
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Remover: <FailureReasonChart /> */}
  <Card> {/* Faturamento por Categoria */}
```

### Alterações no HistoricoManutencaoModal.tsx:

```tsx
// Adicionar imports
import { RadarChart, PolarAngleAxis, PolarGrid, Radar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Mapeamento de motivos
const FAILURE_REASONS = {
  revisao_completa: { ptBR: "Revisão Completa", en: "Complete Revision" },
  haste_quebrada: { ptBR: "Haste Quebrada", en: "Broken Rod" },
  vazamento_vedacoes: { ptBR: "Vazamento nas Vedações", en: "Seal Leakage" },
  outros: { ptBR: "Outros", en: "Others" },
};

// Dentro do componente, após definir historico:
const failureReasonData = useMemo(() => {
  const counts: Record<string, number> = {};
  historico.forEach((item) => {
    const motivo = item.motivo_falha || 'outros';
    counts[motivo] = (counts[motivo] || 0) + 1;
  });
  
  return Object.entries(FAILURE_REASONS).map(([key, labels]) => ({
    reason: language === 'pt-BR' ? labels.ptBR : labels.en,
    count: counts[key] || 0,
  }));
}, [historico, language]);
```

### Resultado Visual

O gráfico de radar será exibido:
- Dentro do modal de histórico de manutenção
- Após o grid de resumo (quantidade de manutenções, cliente, tendência)
- Com estilo consistente (glowing stroke effect)
- Agregando apenas os motivos de falha das ordens encontradas na pesquisa

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/pages/Dashboard.tsx` | Remover import e uso do FailureReasonChart |
| `src/components/HistoricoManutencaoModal.tsx` | Adicionar gráfico de radar de motivos de falha |

