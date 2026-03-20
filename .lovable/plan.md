

## Plan: "Enviar por Email" Button on Invoice Form

### Overview
Add a "Send by Email" button on the nota fiscal step of `EmitirNotaModal` that sends a webhook to n8n with selected client emails. Includes a multi-select of registered emails and an option to add new emails (which get saved to the client record).

### Database Change

**Migration: Add `emails_adicionais` column to `clientes`**
- `ALTER TABLE clientes ADD COLUMN emails_adicionais text[] DEFAULT '{}'`
- This stores additional emails beyond the main `email` field
- Existing single `email` field remains as the primary contact email

### Changes to `src/components/EmitirNotaModal.tsx`

1. **Fetch client emails** — When modal opens, query `clientes` by `nome` matching `orcamento.cliente_nome` to get `email` + `emails_adicionais`. Build a unified list of all available emails.

2. **Add "Enviar por Email" button** on the `nota_fiscal` step (next to "Criar Lançamento Financeiro"), styled as secondary/outline.

3. **Email selection UI** (shown when button is clicked, before actual send):
   - Multi-select checkboxes with all client emails (primary + additional)
   - Input field to add a new email + "Adicionar" button
   - When a new email is added: immediately append to the select list AND save it to `clientes.emails_adicionais` via Supabase update
   - "Enviar" button to confirm and send webhook

4. **Webhook call** — Use existing `enviarWebhook` utility to send to n8n with payload:
   - `tipo: "envio_nota_fiscal"`
   - `emails_destinatarios: [selected emails]`
   - `numero_nf`, `cliente_nome`, `valor`, `numero_orcamento`, `numero_pedido`
   - `pdf_nota_fiscal_url` (the uploaded PDF URL)
   - `empresa_id` (automatic via `enviarWebhook`)

### Changes to `src/hooks/use-clientes.ts`

- Add `adicionarEmail` function that appends a new email to `emails_adicionais` array using `array_append`
- Export the function for use in the modal

### Flow
1. User fills nota fiscal number + attaches PDF
2. User clicks "Enviar por Email"
3. A section expands showing checkboxes with all client emails
4. User can add a new email (gets saved to client + added to list)
5. User selects desired emails and clicks "Enviar"
6. Webhook is sent to n8n, toast confirms
7. User can then proceed to "Criar Lançamento Financeiro" as before

### Files Modified
- **New migration**: Add `emails_adicionais` column
- **`src/components/EmitirNotaModal.tsx`**: Email selection UI + webhook send
- **`src/hooks/use-clientes.ts`**: Add `adicionarEmail` function + update `Cliente` interface

