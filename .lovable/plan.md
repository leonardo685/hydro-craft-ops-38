

## Plan: Add "Enviar para Gravação" Button to Equipment Label

### Overview
Add a button that generates the PNG and DXF files in-memory, then sends them via multipart/form-data POST to a configurable webhook URL.

### Changes

**1. `src/components/EquipmentLabel.tsx`**
- Import `Send` icon from lucide-react, add `toast` from sonner
- Add `sendingToLaser` state for loading control
- Create `generatePNGBlob()` helper — reuses the canvas logic from `handleDownload` but returns a `Blob` instead of triggering download
- Create `generateDXFBlob()` helper — reuses the DXF generation logic from `handleDownloadDXF` but returns a `Blob`
- Create `handleSendToLaser()` function that:
  1. Calls `generatePNGBlob()` and `generateDXFBlob()` 
  2. Builds `FormData` with `orderNumber`, `pngFile`, `dxfFile`
  3. POSTs to the webhook URL from `WEBHOOK_URL_CENTRAL` (from `webhook-utils.ts`, since this is a Vite project — no `NEXT_PUBLIC_` env vars)
  4. Shows success/error toasts
- Add the button in the action buttons row, with loading state and disabled when sending

**2. Webhook URL**
The project already has a centralized webhook URL in `src/lib/webhook-utils.ts`. Since this is a Vite project (not Next.js), `NEXT_PUBLIC_` env vars don't work. I'll use `WEBHOOK_URL_CENTRAL` from the existing utility, keeping the architecture consistent. The n8n workflow can route based on the `tipo` field in the payload.

However, since the request specifically asks for a separate configurable URL and uses `multipart/form-data` (different from the JSON webhook pattern), I'll use a new env var `VITE_N8N_GRAVACAO_WEBHOOK_URL` that can be set in `.env`. The button will be disabled if the URL is not configured.

### Button placement
Added as a 4th button in the existing flex row, same styling as the other outline buttons.

