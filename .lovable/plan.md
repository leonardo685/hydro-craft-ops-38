

## Plan: Add "Copy from Existing Budget" Option in Blank Budget Creation

### Overview
Add a third option in the new budget creation sheet: "Copiar de Orçamento Existente". This allows the user to search and select an existing budget, then navigate to the new budget form pre-filled with only technical data (items: peças, serviços, usinagem) and photos — keeping all header and commercial fields blank/editable.

### Changes

**1. `src/pages/Orcamentos.tsx` — Add third card in the Sheet**

- Add state: `searchTermOrcamento`, `orcamentosFiltered`, `selectedOrcamentoCopia`
- Add a search input + select dropdown to pick an existing budget (similar to "Baseado em Ordem de Serviço" pattern)
- On confirm, fetch the selected budget's items (`itens_orcamento`) and photos (`fotos_orcamento`) from Supabase
- Navigate to `/orcamentos/novo` passing a `copiaOrcamento` object in `location.state` containing only `itens` and `fotos` arrays (no header/commercial data, no `ordem_referencia`, no `ordem_servico_id`, no `numero_nota`)

**2. `src/pages/NovoOrcamento.tsx` — Handle `copiaOrcamento` state**

- Detect `location.state?.copiaOrcamento` 
- If present, populate `itensAnalise` (pecas, servicos, usinagem) from the copied items
- Load copied photos into the `fotos` state (reuse existing photo URLs)
- Keep all `dadosOrcamento` fields at their defaults (blank client, blank nota, new auto-generated number)
- Keep all `informacoesComerciais` at defaults
- Generate a new budget number as usual

### UI in Sheet
The third card will appear between "Orçamento em Branco" and "Baseado em Ordem de Serviço":
- Icon: `Copy` 
- Title: "Copiar de Orçamento Existente"
- Description: "Copiar peças, serviços e fotos de um orçamento existente"
- Search input to filter budgets by number, client, or equipment
- Select dropdown with filtered results
- Confirm button

### Data Copied vs Not Copied
- **Copied**: items (peças, serviços, usinagem with quantities/values), photos (URLs + legends + apresentar flag)
- **Not copied**: client, nota fiscal, ordem referência, commercial terms, pricing fields, dates — all start blank/default

