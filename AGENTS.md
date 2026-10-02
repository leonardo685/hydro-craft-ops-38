# Project architecture rules

- Keep public technical-report PDF layout in `src/lib/laudo-moderno-pdf.ts`; the public page only gathers data and invokes it, so presentation changes remain isolated and reusable.