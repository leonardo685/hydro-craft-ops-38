# Project architecture rules

- Delete rejected quotes through the company-scoped, security-invoker `excluir_orcamento_rejeitado` transaction; preserve linked service orders and block financial dependencies to prevent partial or destructive financial changes.

- Centralize company-specific capabilities — fiscal workflows, completion routing and which document fields each company prints — in `src/lib/company-features.ts`, based on the active company rather than language, to isolate US changes from Brazil.
- Keep visual quote fee and tax totals, including approval dialog amounts, in `src/lib/quote-card-values.ts`, derived from persisted quote values and active company; persist the discounted base separately from urgency to avoid double charging, and never use manual technician amounts as tax.

- Keep public technical-report PDF layout in `src/lib/laudo-moderno-pdf.ts`; the public page only gathers data and invokes it, so presentation changes remain isolated and reusable.
- Keep modern quote PDF tax calculation in `src/lib/orcamento-modern-pdf.ts`, using the budget's persisted tax selection so every export path stays consistent.
- Resolve delivery photos in the shared modern invoice PDF generator and filter ownership through `src/lib/invoice-delivery-photos.ts` so every export path uses only finalized orders belonging to that invoice and company.
- Resolve the modern quote's reference QR inside its shared PDF generator, accepting only a unique existing order scoped to the active company, so all export paths omit missing or ambiguous references consistently.