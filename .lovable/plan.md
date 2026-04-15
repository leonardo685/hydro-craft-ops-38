

# Plano: PDF Orçamento — Remover Grades + Marca d'Água

## Resumo
Redesign visual do PDF de orçamentos: remover todas as bordas/grades das células e adicionar marca d'água com logo da empresa. Todas as informações existentes permanecem exatamente iguais — apenas mudanças visuais.

## Alterações

### 1. Remover bordas de células (ambos arquivos)
- Remover todas as chamadas `doc.rect(x, y, w, h)` sem `'F'` (somente bordas)
- Remover chamadas `doc.rect(x, y, w, h, 'FD')` trocando por `'F'` (manter preenchimento, tirar borda)
- **Manter**: preenchimentos de fundo cinza dos cabeçalhos de seção (`doc.rect(..., 'F')` com `setFillColor(220,220,220)`)
- **Manter**: zebra-striping (fundo alternado) na tabela de itens
- **Manter**: linha vermelha decorativa do cabeçalho e triângulos
- Remover chamadas `doc.setDrawColor(200, 200, 200)` que antecedem as bordas removidas
- Adicionar separadores horizontais sutis (linhas cinza claro finas) entre seções para manter legibilidade

### 2. Marca d'água com logo (~15% opacidade)
- No loop de rodapé que percorre todas as páginas, adicionar:
  - `doc.saveGraphicsState()` + `GState({opacity: 0.12})` + logo centralizado (~100x50mm) + `doc.restoreGraphicsState()`
- Usar `empresaAtual?.logo_url` com fallback para o logo local
- Carregar logo via `loadLogoForPDF()` já existente em `pdf-logo-utils.ts`

### 3. Arquivos modificados
- **`src/pages/NovoOrcamento.tsx`** — ~310 chamadas `doc.rect` a revisar (linhas ~1700-2200)
- **`src/pages/Orcamentos.tsx`** — ~111 chamadas `doc.rect` a revisar (linhas ~660-1400)

### O que NÃO muda
- Todas as informações, campos e textos continuam idênticos
- Posicionamento dos textos permanece igual
- Cabeçalhos de seção mantêm fundo cinza
- Triângulos decorativos e linha vermelha do header mantidos
- Rodapé com paginação e data mantido

