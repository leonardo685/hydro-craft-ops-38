# Precificação: Simples Nacional x Lucro Real

Adicionar na tela de precificação do orçamento um seletor de regime tributário. **Simples Nacional** continua exatamente como está hoje. **Lucro Real** ganha um formulário novo, baseado na planilha enviada.

## Seletor de regime

No topo do modal de precificação, dois botões/abas: `Simples Nacional` (padrão) e `Lucro Real`. Trocar o regime troca o formulário exibido; o cálculo atual do Simples fica intocado.

## Formulário Lucro Real

**Preço base (a cobrar)** — valor de venda informado (ex.: 1.290,00).

**Custos por hora** (linhas editáveis, quantidade x valor/hora):
- Hora torno (ex.: 0,5 x 40 = 20,00)
- Hora shop (ex.: 3 x 20 = 60,00)
- Possibilidade de adicionar/remover linhas de hora extra

**Custos percentuais sobre o preço base**:
- Fixas (ex.: 12% x 1.290 = 154,80)
- Insumos (ex.: 2% x 1.290 = 25,80)

**Outros custos** (quantidade x valor unitário):
- Depreciação torno (ex.: 0,5 x 2 = 1,00)
- Vedações (ex.: 2 x 150 = 300,00 — conforme composição)
- Linhas livres adicionáveis

**Composição de preço** (o que se cobra por item, quantidade x valor de venda):
- Torno (0,5 x 300 = 150,00)
- Shop (3 x 150 = 450,00)
- Vedações (2 x 150 = 300,00)
- Linhas livres adicionáveis

## Resultados calculados

```text
Custo Total   = soma dos custos (horas + fixas + insumos + depreciação + vedações)
Preço atual   = soma da composição de preço  (ou preço base, quando não preenchida)
Lucro         = Preço base - Custo Total
Imposto       = % de imposto x Lucro          (imposto incide sobre o lucro)
Lucro Real    = Lucro - Imposto
% Lucro Real  = Lucro Real / Preço base
```

O percentual de imposto sobre o lucro é um campo editável (padrão configurável, ex. 27%), com o valor calculado mostrado ao lado. Todos os resultados aparecem em um painel de resumo à direita, com destaque para Lucro Real e o percentual.

## Escopo

- Cálculo e exibição apenas na tela de precificação; nenhum PDF é alterado.
- Os valores do Lucro Real são persistidos junto ao orçamento (para reabrir e continuar editando), sem mudar os campos usados pelo Simples Nacional.

## Detalhes técnicos

- `src/components/PrecificacaoModal.tsx`: estado `regime` ('simples' | 'lucro_real'), renderização condicional dos formulários, painel de resumo do Lucro Real.
- `src/lib/precificacao-utils.ts`: novos tipos (`ItemHora`, `ItemComposicao`, `PrecificacaoLucroReal`) e funções puras de cálculo (custo total, lucro, imposto sobre lucro, lucro real, percentual).
- Persistência: nova coluna `jsonb` `precificacao_lucro_real` (com `regime` incluído) em `orcamentos`, via migração; sem alterar colunas existentes.
