
# Plano: Corrigir Gráfico de Motivos de Falha

## Problema Identificado

O gráfico de motivos de falha não está aparecendo porque a lógica de contagem espera chaves internas (ex: `revisao_completa`, `haste_quebrada`), mas os dados no banco de dados estão salvos em texto traduzido (ex: `"Complete Revision"`, `"Broken Rod"`, `"Seal Leakage"`).

### Dados atuais no banco:
| Ordem | motivo_falha |
|-------|--------------|
| MH-003-25 | Broken Rod |
| MH-002-25 | Seal Leakage |
| MH-001-26 | Complete Revision |
| MH-002-26 | Broken Rod |

### Problema no código:
O código verifica se o `motivo_falha` é igual a chaves como `"revisao_completa"`, mas o valor real é `"Broken Rod"`. Resultado: contagem fica zero para todos.

---

## Solução

Vou atualizar o mapeamento `FAILURE_REASONS` para incluir **todas as variantes possíveis** (chave interna, português e inglês) e ajustar a função de agregação para reconhecer os valores de texto.

---

## Mudanças a Realizar

### Arquivo: `src/components/HistoricoManutencaoModal.tsx`

1. **Atualizar o mapeamento de motivos de falha** para incluir todas as variantes de texto:

```tsx
const FAILURE_REASONS = {
  revisao_completa: { 
    ptBR: "Revisão Completa", 
    en: "Complete Revision",
    matches: ["revisao_completa", "Revisão Completa", "Complete Revision"]
  },
  haste_quebrada: { 
    ptBR: "Haste Quebrada", 
    en: "Broken Rod",
    matches: ["haste_quebrada", "Haste Quebrada", "Broken Rod"]
  },
  vazamento_vedacoes: { 
    ptBR: "Vazamento nas Vedações", 
    en: "Seal Leakage",
    matches: ["vazamento_vedacoes", "Vazamento nas Vedações", "Seal Leakage"]
  },
  outros: { 
    ptBR: "Outros", 
    en: "Others",
    matches: ["outros", "Outros", "Others"]
  },
};
```

2. **Ajustar a lógica de agregação** no `useMemo` para reconhecer os textos:

```tsx
const failureReasonData = useMemo(() => {
  const counts: Record<string, number> = {
    revisao_completa: 0,
    haste_quebrada: 0,
    vazamento_vedacoes: 0,
    outros: 0,
  };
  
  historico.forEach((item) => {
    const motivo = item.motivo_falha;
    if (!motivo) return;
    
    // Encontrar a chave correta baseado no texto
    let foundKey = 'outros';
    for (const [key, config] of Object.entries(FAILURE_REASONS)) {
      if (config.matches.includes(motivo)) {
        foundKey = key;
        break;
      }
    }
    counts[foundKey]++;
  });
  
  return Object.entries(FAILURE_REASONS).map(([key, labels]) => ({
    reason: language === 'pt-BR' ? labels.ptBR : labels.en,
    count: counts[key] || 0,
  }));
}, [historico, language]);
```

---

## Resultado Esperado

Após a correção:
- O gráfico de radar irá aparecer abaixo da timeline
- Os motivos "Broken Rod", "Seal Leakage" e "Complete Revision" serão contabilizados corretamente
- O total de registros será exibido no badge do card

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/components/HistoricoManutencaoModal.tsx` | Corrigir mapeamento e lógica de agregação |
