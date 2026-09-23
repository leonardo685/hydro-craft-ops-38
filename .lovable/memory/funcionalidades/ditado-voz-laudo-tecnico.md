---
name: Ditado por voz do laudo técnico
description: Botão de microfone no campo de laudo técnico que transcreve a fala e organiza em tópicos formais por componente
type: feature
---
No campo de laudo técnico (Dados da Peritagem, `NovaAnalise.tsx`) existe o botão de microfone `src/components/DitarLaudoButton.tsx`. Ele grava WAV via `src/lib/wav-recorder.ts` (Web Audio, arquivo completo) e envia para a edge function `laudo-tecnico-voz`.

A função faz duas etapas:
1. Transcrição em `/v1/audio/transcriptions` com `google/gemini-3.5-transcribe` (MIME forçado para `audio/*`, limite 13MB).
2. Organização com `openai/gpt-6-astra` em `/v1/responses` (streaming consumido no servidor), gerando tópicos numerados por componente, linguagem técnica formal, sem markdown, preservando números/medidas/unidades. Se já existir texto no campo, ele é mantido e complementado com renumeração.

O idioma segue o idioma da tela (pt-BR / en / es) e o resultado grava em `laudo_tecnico` (PT) ou `laudo_tecnico_en` (EN/ES). Formato de saída esperado: "1. Piston Rod\n<descrição>\n\n2. Rear Eye\n...".
