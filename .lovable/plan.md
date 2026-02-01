
# Plano: Corrigir Vazamento de Dados Multi-Tenant nas Ordens Aguardando Retorno

## Problema Identificado

Quando o usuário emite uma nota de retorno no sistema de Faturamento, ordens de outras empresas aparecem temporariamente na lista. Isso ocorre porque o componente `OrdensAguardandoRetorno` possui uma função interna `loadOrdens()` que busca dados **sem filtrar por empresa**.

**Fluxo do bug:**
1. Usuário clica em "Emitir Nota de Retorno"
2. Sistema confirma a emissão e chama `loadOrdens()` para atualizar a lista
3. `loadOrdens()` busca TODAS as ordens com status `aguardando_retorno` de TODAS as empresas
4. Ordens de outras empresas aparecem momentaneamente
5. Ao atualizar a página, os dados corretos (filtrados) são carregados novamente

## Solução

Modificar o componente `OrdensAguardandoRetorno` para:
1. Receber o `empresaId` como prop obrigatória
2. Filtrar a query `loadOrdens()` pelo `empresa_id`
3. Atualizar o `Faturamento.tsx` para passar o `empresaId` para o componente

## Arquivos a Modificar

### 1. `src/components/OrdensAguardandoRetorno.tsx`

**Mudanças:**
- Adicionar `empresaId` como prop obrigatória na interface
- Atualizar a função `loadOrdens()` para incluir filtro `.eq('empresa_id', empresaId)`
- Adicionar `empresaId` como dependência do `useEffect`
- Retornar estado vazio se `empresaId` não estiver disponível

```typescript
// Interface atualizada
export function OrdensAguardandoRetorno({
  isExpanded = true,
  onToggleExpand,
  ordensExternas,
  empresaId  // Nova prop obrigatória
}: {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  ordensExternas?: OrdemAguardandoRetorno[];
  empresaId?: string;  // Nova prop
})

// Query atualizada
const loadOrdens = async () => {
  if (!empresaId) {
    setOrdens([]);
    setLoading(false);
    return;
  }
  
  const { data, error } = await supabase
    .from('ordens_servico')
    .select(...)
    .eq('empresa_id', empresaId)  // Filtro adicionado
    .eq('status', 'aguardando_retorno')
    ...
};
```

### 2. `src/pages/Faturamento.tsx`

**Mudanças:**
- Passar `empresaId={empresaAtual?.id}` para o componente `OrdensAguardandoRetorno`

```tsx
<OrdensAguardandoRetorno 
  ordensExternas={ordensRetornoFiltradas}
  empresaId={empresaAtual?.id}
/>
```

## Detalhes Técnicos

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `OrdensAguardandoRetorno.tsx` | Adicionar prop + filtro SQL |
| `Faturamento.tsx` | Passar empresaId como prop |

### Segurança
Esta correção é crítica para o isolamento multi-tenant do sistema, garantindo que dados de uma empresa nunca sejam visíveis para usuários de outra empresa, mesmo momentaneamente durante operações de atualização.
