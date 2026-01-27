

## Plano: Adicionar Filtro de OS Vinculada

### Alterações no arquivo `src/pages/Orcamentos.tsx`:

---

### 1. Adicionar novo estado para o filtro

Na seção de estados (~linha 70), adicionar:

```typescript
const [filtroOsVinculada, setFiltroOsVinculada] = useState("MH-");
```

O valor padrão será "MH-" conforme solicitado.

---

### 2. Adicionar input do filtro na UI

Na área de filtros (~linha 1840), após o filtro de "Número do Orçamento", adicionar um quinto campo:

```tsx
{/* Filtro por OS Vinculada */}
<div className="space-y-2">
  <Label htmlFor="filtro-os">OS Vinculada</Label>
  <Input
    id="filtro-os"
    placeholder="MH-013-26"
    value={filtroOsVinculada}
    onChange={(e) => setFiltroOsVinculada(e.target.value)}
  />
</div>
```

---

### 3. Atualizar a função `aplicarFiltros`

Adicionar lógica para filtrar por OS vinculada (~linha 274):

```typescript
// Filtro por OS vinculada
if (filtroOsVinculada && filtroOsVinculada !== "MH-") {
  const temOsCorrespondente = orc.ordens_vinculadas?.some((ordem: any) => 
    ordem.numero_ordem?.toLowerCase().includes(filtroOsVinculada.toLowerCase())
  );
  if (!temOsCorrespondente) {
    return false;
  }
}
```

---

### 4. Atualizar o botão "Limpar Filtros"

Adicionar o novo filtro na condição e no reset (~linha 1844-1854):

- Condição: incluir `filtroOsVinculada !== "MH-"` na verificação
- Reset: definir `setFiltroOsVinculada("MH-")` ao invés de string vazia

---

### 5. Ajustar o grid de filtros

Mudar de `lg:grid-cols-4` para `lg:grid-cols-5` para acomodar o novo campo.

---

### Resultado Esperado

- Novo campo de filtro "OS Vinculada" aparece ao lado dos filtros existentes
- O campo inicia com "MH-" pré-preenchido (prefixo padrão)
- Ao digitar um número (ex: "MH-013-26"), filtra orçamentos que possuem essa OS vinculada
- O botão "Limpar Filtros" reseta para "MH-" (não para vazio)

