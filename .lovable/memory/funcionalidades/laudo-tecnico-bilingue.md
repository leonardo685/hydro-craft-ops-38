---
name: Laudo técnico bilíngue na peritagem
description: Campo de laudo técnico PT/EN em Dados da Peritagem, exibido no PDF da ordem e no lugar das observações no PDF do orçamento
type: feature
---
Em Dados da Peritagem (`NovaAnalise.tsx`) existem dois campos de texto livre: Laudo Técnico (Português) e Technical Report (English), gravados em `ordens_servico.laudo_tecnico` e `laudo_tecnico_en`.

Onde aparece:
- PDF da ordem/análise técnica (`src/lib/analise-tecnica-pdf.ts`), seção LAUDO TÉCNICO / TECHNICAL REPORT / INFORME TÉCNICO.
- PDF do orçamento (`Orcamentos.tsx` e `NovoOrcamento.tsx`): o laudo substitui o texto das observações; se não houver laudo, usa as observações do orçamento.
- A versão exibida segue o idioma selecionado (PT-BR usa `laudo_tecnico`; demais idiomas usam `laudo_tecnico_en`), com fallback para a outra versão.

Motivo da falha: o banco guarda o rótulo ("Haste Quebrada"), então ao abrir a ordem é necessário converter o rótulo de volta para a chave do seletor (`parseMotivoFalha` em `NovaAnalise.tsx`); valores livres caem em "outros".
