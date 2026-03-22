

## Plan: Auto-fill Pedido Number in Return Note Text

### Problem
The return note text currently shows `II - Pedido N (a configurar)` even when the linked budget (orçamento) has a `numero_pedido` stored from approval.

### Solution
Fetch `numero_pedido` from the linked `orcamentos` table when the modal opens and use it in the `textoNota` template.

### Changes to `src/components/EmitirNotaRetornoModal.tsx`

1. **Add state** for `numeroPedido` (string, default empty)

2. **Add useEffect** that runs when modal opens with `ordem.orcamento_vinculado` set — queries `orcamentos` by `numero` to get `numero_pedido` and stores it in state

3. **Update `textoNota`** from:
   ```
   II - Pedido N (a configurar)
   ```
   to:
   ```
   II - Pedido ${numeroPedido || 'N (a configurar)'}
   ```

This way, when a budget has a linked order number (pedido), it auto-fills; otherwise it keeps the placeholder text.

### Files Modified
- `src/components/EmitirNotaRetornoModal.tsx`

