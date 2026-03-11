

## Plan: Allow Multiple Orders per NFe Item Based on Quantity

### Problem
When an NFe item has quantity > 1 (e.g., 12 cylinders), the system marks the entire item as unavailable after just one order is created. It should allow creating orders until the quantity is exhausted.

### Changes

**`src/components/CriarOrdemModal.tsx`**

1. **Change `ordensMap` from `Map<string, string>` to `Map<string, string[]>`** — store an array of order numbers per key instead of a single one.

2. **Update enrichment logic** — for each item, compare `ordensMap.get(key).length` against `item.quantidade`. If orders created < quantity, the item remains available (selectable). Show the count of existing orders (e.g., "1/12 criadas").

3. **Update the Status column** — instead of just showing one badge:
   - If all units have orders: show disabled badge "12/12 ✅" 
   - If some units have orders: show "1/12 criadas" + "Disponível" badge (still selectable)
   - If no orders: show "Disponível" as today

4. **Update `itensDisponiveis` filter** — an item is available if orders count < quantity.

5. **Update "Itens disponíveis" count** — show count of items that still have remaining units.

6. **Pass remaining quantity info** to the navigation state so downstream form knows context.

### UI Result
The item row with 12 qty and 1 existing order will show something like "1/12 · MH-036-26" in the status column, remain selectable, and the user can keep creating orders until 12/12.

