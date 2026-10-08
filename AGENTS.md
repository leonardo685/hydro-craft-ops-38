# Project architecture rules

- Keep public technical-report PDF layout in `src/lib/laudo-moderno-pdf.ts`; the public page only gathers data and invokes it, so presentation changes remain isolated and reusable.
- Keep modern quote PDF tax calculation in `src/lib/orcamento-modern-pdf.ts`, using the selected client's persisted tax status so every export path stays consistent.