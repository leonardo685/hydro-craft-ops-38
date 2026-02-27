

# Fix: Laudo de Teste showing data from wrong company

## Problem

When clicking "Laudo de Teste" in Aprovados and searching for an order, the system opens `/laudo-publico/{numeroOrdem}`. The `LaudoPublico.tsx` page is a **public route** (no auth context) and queries `ordens_servico` by `numero_ordem` **without filtering by `empresa_id`**. When two companies have orders with the same number (e.g., MH-002-26), it can return data from the wrong company.

## Root Cause

- `LaudoPublico.tsx` line 173-179: fetches all orders matching `numero_ordem` across ALL companies
- The `encontrarOrdemCorreta` function picks the first "finalized" one, which may belong to another company

## Solution

Pass the **order ID** as a query parameter when navigating from the authenticated Aprovados page. The LaudoPublico page will use this ID to load the correct order when available, falling back to the current numero_ordem-based logic for external/QR code access.

## Changes

### 1. `src/pages/Aprovados.tsx`
- In `verificarEAbrirLaudo`: change the URL from `/laudo-publico/{numeroOrdem}` to `/laudo-publico/{numeroOrdem}?ordemId={ordem.id}`
- In `abrirLaudoDoHistorico`: same change, pass `ordemId` as query param

### 2. `src/pages/LaudoPublico.tsx`
- Read `ordemId` from URL search params (`useSearchParams` or `URLSearchParams`)
- If `ordemId` is present, fetch the specific order by ID instead of searching by numero_ordem
- If `ordemId` is NOT present (external/QR access), keep the current behavior (search by numero_ordem across all companies)

## Technical Details

In `LaudoPublico.tsx`, the data loading logic (line ~163) will be updated:

```text
if (ordemId exists in URL params) {
  -> fetch single order by ID: .eq('id', ordemId)
} else {
  -> existing logic: fetch by numero_ordem, use encontrarOrdemCorreta()
}
```

This ensures:
- Internal access from Aprovados always loads the correct company's order
- External/public access (QR codes, shared links) continues working as before
- No breaking changes to existing URLs or routes
