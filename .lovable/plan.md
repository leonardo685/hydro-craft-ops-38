
## Plano: Filtro de Categoria Mae Inclui Categorias Filhas

### Objetivo
Quando uma categoria mae for selecionada no filtro de categoria do Extrato, o sistema deve mostrar todos os lancamentos da categoria mae E de todas as categorias filhas vinculadas a ela.

---

### Contexto Atual

No arquivo `src/pages/DFC.tsx`, linha 513, o filtro de categoria funciona assim:

```typescript
if (filtrosExtrato.categoria !== 'todas' && item.categoriaId !== filtrosExtrato.categoria) return false;
```

Este codigo compara apenas o ID exato da categoria. Se o usuario seleciona "1 - Receitas Operacionais" (categoria mae), so aparecem lancamentos com esse ID exato, nao os lancamentos das filhas como "1.1 - Reforma de Cilindros Hidraulicos" ou "1.2 - Fabricacao de Cilindros Hidraulicos".

---

### Solucao Proposta

#### 1. Criar funcao helper para obter IDs das categorias filhas

Adicionar uma nova funcao memoizada que, dado um ID de categoria, retorna um array com o ID dela mesma mais todos os IDs das categorias filhas:

```typescript
const getCategoriasFilhasIds = useMemo(
  () => (categoriaId: string): string[] => {
    const categoria = categorias.find(c => c.id === categoriaId);
    if (!categoria) return [categoriaId];
    
    // Se for categoria mae, incluir ela e todas as filhas
    if (categoria.tipo === 'mae') {
      const filhas = categorias
        .filter(c => c.categoriaMaeId === categoriaId)
        .map(c => c.id);
      return [categoriaId, ...filhas];
    }
    
    // Se for categoria filha, retorna apenas ela
    return [categoriaId];
  },
  [categorias]
);
```

---

#### 2. Atualizar a logica de filtragem no `extratoFiltrado`

Modificar a linha 513 do `extratoFiltrado` para usar a nova funcao:

**De:**
```typescript
if (filtrosExtrato.categoria !== 'todas' && item.categoriaId !== filtrosExtrato.categoria) return false;
```

**Para:**
```typescript
if (filtrosExtrato.categoria !== 'todas') {
  const categoriasPermitidas = getCategoriasFilhasIds(filtrosExtrato.categoria);
  if (!categoriasPermitidas.includes(item.categoriaId)) return false;
}
```

---

### Arquivos a Modificar

1. **src/pages/DFC.tsx**
   - Adicionar funcao `getCategoriasFilhasIds` (aproximadamente linha 435, apos `extratoData`)
   - Modificar o filtro `extratoFiltrado` (linha 513)

---

### Comportamento Esperado

| Categoria Selecionada | Lancamentos Exibidos |
|----------------------|----------------------|
| Todas | Todos os lancamentos |
| 1 - Receitas Operacionais (mae) | Lancamentos de 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7 |
| 1.2 - Fabricacao de Cilindros (filha) | Apenas lancamentos de 1.2 |
| 2 - Custos Variaveis (mae) | Lancamentos de 2, 2.1, etc. |

---

### Detalhes Tecnicos

- A funcao `getCategoriasFilhasIds` sera memoizada com `useMemo` para evitar recalculos desnecessarios
- Dependencia: `categorias` (ja disponivel via `useCategoriasFinanceiras`)
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca na interface visual (apenas na logica de filtragem)
