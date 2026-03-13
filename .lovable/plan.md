

## Plan: Vincular Nota Fiscal a Ordem Existente

### Problem
Orders created without an NFe (like MH-037-25) lack `nota_fiscal`, `nota_fiscal_id`, and `chave_acesso_nfe` on their `recebimentos` record, so they don't appear in the "Notas Fiscais" tab.

### Solution
Create a new modal `VincularNFeModal` that allows linking an NFe access key to an existing order. Add a button on each order card in the Aprovados page (and potentially Recebimentos).

### Flow
1. User clicks "Vincular NFe" button on an order card
2. Modal opens with an input for the 44-digit access key
3. System validates the key, extracts NFe data (reusing existing `nfe-utils`)
4. System saves/finds the `notas_fiscais` record and its `itens_nfe`
5. System updates the `recebimentos` record with `nota_fiscal`, `nota_fiscal_id`, `chave_acesso_nfe`, and `descricao_nfe`
6. Toast confirms success, data reloads

### Changes

**1. New component: `src/components/VincularNFeModal.tsx`**
- Props: `open`, `onClose`, `ordem` (the order to link), `onSuccess` callback
- Input for access key, validate button (reuses `validarChaveAcesso`, `extrairDadosNFe`)
- Shows extracted NFe info (number, CNPJ, items)
- If multiple items on the NFe, let user pick which item corresponds to this order
- On confirm: upsert `notas_fiscais` + `itens_nfe`, then update `recebimentos` setting `nota_fiscal`, `nota_fiscal_id`, `chave_acesso_nfe`
- Uses existing `useRecebimentos().criarNotaFiscal()` for the NFe record, then a direct Supabase update on the recebimento

**2. `src/pages/Aprovados.tsx` — Add "Vincular NFe" button**
- Import `VincularNFeModal`
- Add state for modal open + selected order
- Show the button only when the order's `recebimentos?.chave_acesso_nfe` is null
- On success, reload orders

**3. `src/pages/Recebimentos.tsx` — Add "Vincular NFe" option (optional, same pattern)**
- Add the same button in the orders tab for orders without an NFe linked

### Data Updated on `recebimentos`
- `nota_fiscal` → NFe number (e.g., "956828")
- `nota_fiscal_id` → UUID of the `notas_fiscais` record
- `chave_acesso_nfe` → normalized 44-digit key
- `descricao_nfe` → item description from NFe (if user selects one)
- `observacoes` → updated with "Item da NFe: CODE | Valor: VALUE" for matching

