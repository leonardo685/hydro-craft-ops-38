# Project architecture rules

- Centralize company-specific fiscal capabilities and completion routing in `src/lib/company-features.ts`, based on the active company rather than language, to isolate US changes from Brazil.
- Keep visual quote fee and tax totals in `src/lib/quote-card-values.ts`, derived from persisted quote values and active company; never use manual technician amounts as tax.

- Keep public technical-report PDF layout in `src/lib/laudo-moderno-pdf.ts`; the public page only gathers data and invokes it, so presentation changes remain isolated and reusable.
- Keep modern quote PDF tax calculation in `src/lib/orcamento-modern-pdf.ts`, using the budget's persisted tax selection so every export path stays consistent.
- Resolve the modern quote's reference QR inside its shared PDF generator, accepting only a unique existing order scoped to the active company, so all export paths omit missing or ambiguous references consistently.