

# Plan: "Copiar Ordem de Serviço" on Nova Análise (NovaOrdemDireta)

## What will be built

A searchable/editable dropdown at the top of the "Informações Básicas" card in `NovaOrdemDireta.tsx` that lets the user select an existing order to copy. When selected, it loads all data from that order (client, equipment, technical data, parts, services, machining, observations, photos, and documents) into the form, keeping only the auto-generated new order number.

## Changes

### 1. `src/pages/NovaOrdemDireta.tsx`

**New state and data loading:**
- Add state for the searchable order list and search term
- Fetch existing `ordens_servico` (filtered by `empresa_id`) on mount, loading `numero_ordem`, `id`, `cliente_nome`, `equipamento`
- On order selection, fetch the full order record plus its related `fotos_equipamentos`, `documentos_ordem`, and linked client

**Copy logic (`copiarOrdem` function):**
- Populate `formData` fields: client, equipment, serial number, invoice, urgency, technician, problems, priority, observations, failure reason
- Populate `dadosTecnicos` from the order's technical columns (camisa, haste, curso, etc.)
- Populate `pecasUtilizadas` from `pecas_necessarias` JSON
- Populate services/machining checkboxes and arrays from `servicos_necessarios` / `usinagem_necessaria` JSON
- Download photos from storage and create File objects to populate `fotosChegada` and `fotosAnalise` with previews
- Download documents similarly into `documentos` array
- Keep `formData.numeroOrdem` unchanged (the auto-generated new number)

**UI addition:**
- Add a new row in the "Informações Básicas" card, before the existing fields
- Searchable combobox using the existing `cmdk` / `Command` component pattern, showing orders as `{numero_ordem} - {cliente_nome} - {equipamento}`
- Label: "Copiar de Ordem Existente" with a Copy icon
- When an order is selected, a toast confirms "Dados copiados da ordem {numero}"

### 2. Data flow

```text
User types in searchable dropdown
  → filters ordens_servico list
  → user selects one
  → fetch full order + fotos + docs from Supabase
  → populate all form states
  → keep new numero_ordem intact
  → user can edit anything before saving
```

### Technical notes

- Photos will be fetched as blob URLs for preview, and re-uploaded as new files on save (they are already handled by the existing `uploadFotos` function)
- Documents similarly fetched and added to the `documentos` state for re-upload
- The client is matched by name from the `clientes` list to set the correct `formData.cliente` (client ID)
- Services/machining are parsed from the JSONB arrays stored in the order

