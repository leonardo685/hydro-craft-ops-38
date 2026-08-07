---
name: Tradução de conteúdo dinâmico do laudo público
description: Peças, serviços, usinagem e observações do laudo público (QR code) devem ser traduzidos via dicionário técnico, não só os rótulos
type: feature
---
No laudo público (QR code) TODAS as palavras devem ser traduzidas ao trocar o idioma — inclusive dados vindos do banco (peças, serviços, usinagem, observações, ambiente/fluido de trabalho, equipamento, motivo de falha). Números, medidas, códigos e materiais/marcas (NBR, VITON, TEFLON, ISO) são preservados.

Implementação: `src/i18n/dynamicTerms.ts` expõe `translateTerm(texto, language)` com dicionário PT→EN/ES (frases antes de palavras, sem acento, preservando caixa). Usado em `LaudoPublico.tsx` (tela e PDF) e `HistoricoManutencaoPublicoModal.tsx` via helper `tr()`. Ao adicionar novos termos técnicos, estender o dicionário.
