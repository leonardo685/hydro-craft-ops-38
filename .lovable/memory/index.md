# Project Memory

## Core
- Multi-tenant SaaS with RLS. All DB queries MUST filter by `empresa_id` to prevent cross-tenant data leaks.
- Display order format MH-XXX-YY everywhere. NEVER show the OS-XXXXXXXXXX timestamp format to users.
- Equipment labels and laser exports must always use 'MEC HYDRO' branding.

## Memories
- [Tradução laudo público](mem://funcionalidades/traducao-conteudo-dinamico-laudo) — Tradução de peças/serviços/usinagem do laudo QR via dicionário técnico
