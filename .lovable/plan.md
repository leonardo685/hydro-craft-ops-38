

## Reordenar "Motivo da Falha" na Timeline de Manutenções

### Objetivo
Mover a exibição do campo "Motivo da Falha" para aparecer **abaixo** da informação "OS Anterior" na timeline de manutenções do modal de histórico público.

---

### Alteração no Arquivo: `src/components/HistoricoManutencaoPublicoModal.tsx`

**Reordenar os elementos da timeline (linhas 438-449)**

Atualmente a ordem é:
1. Grid com datas e dias
2. Motivo da Falha (se existir)
3. OS Anterior (se existir)

A nova ordem será:
1. Grid com datas e dias
2. OS Anterior (se existir)
3. Motivo da Falha (se existir)

**Código atual:**
```tsx
{item.motivo_falha && (
  <div className="mt-2 p-2 bg-destructive/10 rounded">
    <span className="text-xs text-muted-foreground">Motivo da Falha:</span>
    <p className="text-sm">{item.motivo_falha}</p>
  </div>
)}

{item.ordem_anterior && (
  <p className="text-xs text-muted-foreground mt-2">
    OS Anterior: {item.ordem_anterior}
  </p>
)}
```

**Código novo (invertido):**
```tsx
{item.ordem_anterior && (
  <p className="text-xs text-muted-foreground mt-2">
    OS Anterior: {item.ordem_anterior}
  </p>
)}

{item.motivo_falha && (
  <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Motivo da Falha:</span>
    <p className="text-sm text-foreground">{item.motivo_falha}</p>
  </div>
)}
```

---

### Melhorias Adicionais

Além da reordenação, vou melhorar o estilo visual do "Motivo da Falha" usando cores âmbar (como no laudo público) em vez de vermelho destrutivo, para manter consistência visual com o resto do sistema.

---

### Resultado Esperado

Na timeline de manutenções, cada item mostrará:
1. Número da ordem e status
2. Grid com Entrada, Saída, Dias no serviço, Dias desde última
3. OS Anterior (se existir) - texto pequeno
4. **Motivo da Falha** (se existir) - card destacado em âmbar abaixo do OS Anterior

