
## Objetivo

Na aba de Precificação (modal `PrecificacaoModal`), adicionar um novo bloco **"Custos Cilindros Hidráulicos"** com um formulário suspenso (collapsible) que replica os cálculos da planilha enviada. O bloco devolve apenas o **Valor Total** consolidado para a tela principal de precificação, somando aos demais custos.

## Estrutura do formulário suspenso

Card colapsável com botão "Adicionar item" que permite incluir múltiplas linhas. Para cada linha o usuário escolhe o **tipo** e preenche as dimensões; o sistema calcula peso e valor total automaticamente.

### Tipos de itens (Matérias-primas)

Baseado na planilha:

| Tipo | Campos de entrada | Cálculo do peso |
|---|---|---|
| SAE 1045 (Êmbolo, Amortecedor, Tampa, Varão, Tirante) | Ø Externo (mm), Comprimento (mm), Valor/KG | Cilindro maciço, densidade aço 7,85 g/cm³ |
| SAE 1045 Cromado (Haste) | Ø Externo (mm), Comprimento (mm), Valor/KG | Cilindro maciço, densidade aço 7,85 |
| Tubo Brunido (Camisa) | Ø Externo, Ø Interno, Parede, Comprimento, Valor/KG | Tubo (área anular × L × 7,85) |
| Bronze TM 23 | Ø Externo, Comprimento, Valor/KG | Cilindro maciço, densidade bronze 8,8 |
| SAE 1020 Oxicorte (Cabeçote) | Espessura, Largura, Comprimento, Valor/KG | Chapa: E×L×C × 7,85 |
| Oxicorte Redondo | Ø Externo, Ø Interno, Parede, Comprimento, Valor/KG | Tubo/disco × 7,85 |
| Ferro Fundido | Ø Externo, Comprimento, Valor/KG | Cilindro maciço, densidade ferro fundido 7,2 |

Para cada um: **Valor Total = Peso (kg) × Valor/KG**.

### Tipos de itens (Serviços)

| Tipo | Campos | Cálculo |
|---|---|---|
| Serviço de Cromo | Ø Haste, Comprimento, Valor/Decímetro | Área superficial (π×D×L) em dm² × Valor/dm² |
| Serviço de Brunimento | Ø Camisa, Comprimento, Horas, Valor/hora | Horas × Valor/hora |

### Cálculos auxiliares exibidos
Cada linha mostra peso calculado (quando aplicável) e valor total individual. Rodapé do bloco exibe **Total Cilindros Hidráulicos**.

## Integração com precificação principal

- O total do bloco é incluído em `totalCustos` (somado a `totalCustosVariaveis`) e impacta `margemContribuicao` / `percentualMargem`.
- Persistido em uma nova coluna `custos_cilindros` (jsonb) na tabela `orcamentos`, salvando a lista de itens e o total.
- Histórico de precificação e PDF passam a incluir esse total.

## Detalhes técnicos

- Novo componente `CustosCilindrosForm.tsx` (collapsible com `Accordion` ou `Collapsible` do shadcn).
- Helpers em `src/lib/precificacao-utils.ts`:
  - `calcularPesoCilindroMacico(diametroMm, comprimentoMm, densidade)`
  - `calcularPesoTubo(deMm, diMm, comprimentoMm, densidade)`
  - `calcularPesoChapa(espMm, largMm, compMm, densidade)`
  - `calcularValorCromo(diametroMm, comprimentoMm, valorDm2)` — área lateral em dm²
  - `calcularValorBrunimento(horas, valorHora)`
  - `calcularTotalCilindros(itens)`
- Migração: `alter table orcamentos add column custos_cilindros jsonb default '[]'::jsonb;`
- `PrecificacaoModal`: novo estado `custosCilindros`, render do card antes/depois do "Custos Variáveis", inclusão em `handleSalvar`, `historico_precificacao` (também precisa coluna nova), `gerarPDFPrecificacao` e `handleBaixarPDFRevisao`.

## Pontos a confirmar antes de implementar

1. **Densidades** — usar 7,85 (aço), 8,8 (bronze TM 23), 7,2 (ferro fundido)? Ou densidades específicas que a empresa adota?
2. **Valores padrão de R$/KG** — devo deixar em branco para o usuário digitar a cada orçamento, ou criar um cadastro de "tabela de preços de matéria-prima" reutilizável (com botão "atualizar tabela")?
3. **Histórico/PDF** — incluir o detalhamento dos itens de cilindro no PDF de precificação ou apenas a linha "Custos Cilindros Hidráulicos: R$ X"?
