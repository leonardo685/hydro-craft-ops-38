

## Plano: Adicionar Modal de Detalhes ao Clicar em Valores do DFC

### Objetivo
Ao clicar no valor de uma categoria no DFC (Demonstracao do Fluxo de Caixa), como "R$ 108.363,00" de "Reforma de Cilindros Hidraulicos", abrir uma janela modal mostrando a lista detalhada de todos os lancamentos que compoem esse valor.

---

### Alteracoes Necessarias

#### 1. Atualizar a Interface `DFCItem` (linha 982)

Adicionar o campo `categoriaId` para rastrear qual categoria cada linha representa:

```typescript
interface DFCItem {
  codigo?: string;
  conta: string;
  valor: number;
  percentual: number;
  tipo: 'categoria_mae' | 'categoria_filha' | 'calculo';
  nivel: number;
  codigoMae?: string;
  categoriaId?: string; // NOVO CAMPO
}
```

---

#### 2. Atualizar o calculo `dfcData` para incluir `categoriaId`

Modificar a funcao `adicionarCategoriaPorCodigo` (linha 1033) para incluir o ID da categoria em cada item:

- Na categoria mae (linha 1041-1048): adicionar `categoriaId: categoriaMae.id`
- Nas categorias filhas (linha 1055-1063): adicionar `categoriaId: filha.id`

---

#### 3. Adicionar estado para o modal de detalhes

Adicionar novo estado apos os outros estados existentes:

```typescript
const [modalDetalhesDFC, setModalDetalhesDFC] = useState<{
  open: boolean;
  categoria: { codigo?: string; nome: string; valor: number } | null;
  categoriaIds: string[];
}>({ open: false, categoria: null, categoriaIds: [] });
```

---

#### 4. Criar memo para lancamentos filtrados do periodo DFC

Criar um `useMemo` para obter os lancamentos que correspondem aos filtros de periodo do DFC:

```typescript
const lancamentosFiltradosPeriodoDFC = useMemo(() => {
  return lancamentos.filter(l => {
    if (l.tipo === 'transferencia') return false;
    if (!l.lancamentoPaiId && l.numeroParcelas && l.numeroParcelas > 1) return false;
    if (!l.pago || !l.dataRealizada) return false;
    
    const dataRealizada = new Date(l.dataRealizada);
    if (dfcDataInicio) {
      const inicio = new Date(dfcDataInicio);
      inicio.setHours(0, 0, 0, 0);
      if (dataRealizada < inicio) return false;
    }
    if (dfcDataFim) {
      const fim = new Date(dfcDataFim);
      fim.setHours(23, 59, 59, 999);
      if (dataRealizada > fim) return false;
    }
    return true;
  });
}, [lancamentos, dfcDataInicio, dfcDataFim]);
```

---

#### 5. Criar funcao handler para clique no valor

Adicionar funcao `useCallback` para tratar o clique:

```typescript
const handleClickValorDFC = useCallback((item: DFCItem) => {
  if (item.tipo === 'calculo' || !item.categoriaId) return;

  let categoriaIds: string[] = [];
  if (item.tipo === 'categoria_mae') {
    const categoriaMae = categorias.find(c => c.id === item.categoriaId);
    if (categoriaMae) {
      const filhas = categorias
        .filter(c => c.categoriaMaeId === categoriaMae.id)
        .map(c => c.id);
      categoriaIds = [categoriaMae.id, ...filhas];
    }
  } else {
    categoriaIds = [item.categoriaId];
  }

  setModalDetalhesDFC({
    open: true,
    categoria: {
      codigo: item.codigo,
      nome: item.conta,
      valor: item.valor
    },
    categoriaIds
  });
}, [categorias]);
```

---

#### 6. Criar memo para lancamentos do modal

```typescript
const lancamentosModalDFC = useMemo(() => {
  if (!modalDetalhesDFC.open || modalDetalhesDFC.categoriaIds.length === 0) return [];
  
  return lancamentosFiltradosPeriodoDFC
    .filter(l => l.categoriaId && modalDetalhesDFC.categoriaIds.includes(l.categoriaId))
    .map(l => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor,
      data: l.dataRealizada instanceof Date ? l.dataRealizada.toISOString() : String(l.dataRealizada),
      fornecedorCliente: l.fornecedorCliente,
      contaBancaria: l.contaBancaria,
      pago: l.pago
    }));
}, [lancamentosFiltradosPeriodoDFC, modalDetalhesDFC]);
```

---

#### 7. Atualizar a celula de valor na tabela do DFC (linha 1324-1326)

Modificar para adicionar o click handler e estilos:

**De:**
```tsx
<TableCell className={cn("text-right", getDfcValueStyle(item.valor, item.tipo))}>
  {formatCurrency(item.valor)}
</TableCell>
```

**Para:**
```tsx
<TableCell className={cn("text-right", getDfcValueStyle(item.valor, item.tipo))}>
  <span 
    className={cn(
      item.tipo !== 'calculo' && item.categoriaId && "cursor-pointer hover:underline hover:text-primary"
    )}
    onClick={() => handleClickValorDFC(item)}
  >
    {formatCurrency(item.valor)}
  </span>
</TableCell>
```

---

#### 8. Adicionar o componente modal ao final do DFC

Importar e renderizar o `DetalhesCategoriaDREModal` (que pode ser reutilizado):

No inicio do arquivo, adicionar:
```typescript
import { DetalhesCategoriaDREModal } from "@/components/DetalhesCategoriaDREModal";
```

Antes do fechamento do `</AppLayout>`, adicionar:
```tsx
<DetalhesCategoriaDREModal
  open={modalDetalhesDFC.open}
  onOpenChange={(open) => setModalDetalhesDFC(prev => ({ ...prev, open }))}
  categoria={modalDetalhesDFC.categoria}
  lancamentos={lancamentosModalDFC}
/>
```

---

### Arquivos a Modificar

1. **src/pages/DFC.tsx**
   - Adicionar import do `DetalhesCategoriaDREModal`
   - Adicionar `categoriaId` na interface `DFCItem`
   - Atualizar `dfcData` para incluir `categoriaId` nas categorias mae e filhas
   - Adicionar estado `modalDetalhesDFC`
   - Adicionar `lancamentosFiltradosPeriodoDFC` useMemo
   - Adicionar `handleClickValorDFC` useCallback
   - Adicionar `lancamentosModalDFC` useMemo
   - Modificar a TableCell do valor para ter onClick e estilos hover
   - Renderizar o modal no final do componente

---

### Comportamento Esperado

| Acao | Resultado |
|------|-----------|
| Clique em "R$ 108.363,00" (Reforma de Cilindros) | Abre modal com lista de todos os lancamentos pagos dessa categoria |
| Clique em "R$ 192.844,95" (Receitas Operacionais - mae) | Abre modal com lancamentos de todas as subcategorias (1.1, 1.2, etc.) |
| Clique em valor de linha de calculo (MARGEM, LUCRO) | Nada acontece (nao sao categorias clicaveis) |

---

### Detalhes Tecnicos

- Reutiliza o componente `DetalhesCategoriaDREModal` ja existente
- O modal mostra: Data, Descricao, Fornecedor/Cliente, Conta Bancaria, Status (Pago/Pendente), Valor
- Para DFC, todos os lancamentos sao pagos (status sempre "Pago")
- Filtragem respeita o periodo selecionado no filtro de data do DFC
- Ao clicar em categoria mae, inclui todos os lancamentos das categorias filhas
