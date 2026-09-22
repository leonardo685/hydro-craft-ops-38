---
name: Laudo técnico por idioma na peritagem
description: Campo único de laudo técnico em Dados da Peritagem, exibido conforme o idioma nos PDFs de ordem e orçamento
type: feature
---
Em Dados da Peritagem (`NovaAnalise.tsx`) existe um único campo de texto livre. O rótulo e o texto digitado acompanham o idioma atual da tela: PT-BR grava em `ordens_servico.laudo_tecnico`; EN/ES gravam em `laudo_tecnico_en`.

Onde aparece:
- PDF da ordem/análise técnica (`src/lib/analise-tecnica-pdf.ts`), seção LAUDO TÉCNICO / TECHNICAL REPORT / INFORME TÉCNICO.
- PDF do orçamento (`Orcamentos.tsx` e `NovoOrcamento.tsx`): o laudo substitui o texto das observações; se não houver laudo, usa as observações do orçamento.
- A versão exibida segue o idioma selecionado (PT-BR usa `laudo_tecnico`; demais idiomas usam `laudo_tecnico_en`), com fallback para a outra versão quando necessário.

Motivo da falha: o banco guarda o rótulo ("Haste Quebrada"), então ao abrir a ordem é necessário converter o rótulo de volta para a chave do seletor (`parseMotivoFalha` em `NovaAnalise.tsx`); valores livres caem em "outros".
