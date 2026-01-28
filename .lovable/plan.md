
## Plano: Adicionar Botao de Copiar Orcamento

### Objetivo
Adicionar um botao de "Copiar" ao lado do botao "Vincular" em cada card de orcamento. Ao clicar, sera criada uma copia completa do orcamento (fotos, servicos, cliente, valores, itens), porem sem copiar a ordem de referencia (`ordem_referencia`). O novo orcamento sera aberto na tela de edicao para ajustes.

---

### Alteracoes no arquivo `src/pages/Orcamentos.tsx`

#### 1. Adicionar funcao `copiarOrcamento`

Criar uma nova funcao assincrona que:

1. Gera um novo numero de orcamento (usando a mesma logica de `gerarProximoNumero` do `NovoOrcamento.tsx`)
2. Cria uma copia do orcamento no banco de dados com:
   - Novo `id` (gerado automaticamente)
   - Novo `numero` (sequencial)
   - Mesmos dados do orcamento original (cliente, equipamento, valor, descricao, etc.)
   - **Sem** `ordem_referencia` (nao copiar)
   - **Sem** `ordem_servico_id` (nao vincular a ordem existente)
   - **Sem** `data_aprovacao`, `data_aprovacao_gestor` (resetar)
   - Status inicial: `pendente`
   - Nova `data_criacao` (data atual)
3. Copia todos os itens do orcamento (`itens_orcamento`) vinculando ao novo orcamento
4. Copia todas as fotos do orcamento (`fotos_orcamento`) vinculando ao novo orcamento
5. Navega para a tela de edicao com o novo orcamento

```text
Fluxo:
[Botao Copiar] 
    -> Gerar novo numero
    -> INSERT em orcamentos (copia dos dados)
    -> INSERT em itens_orcamento (copiar itens)
    -> INSERT em fotos_orcamento (copiar fotos, se existirem)
    -> Navegar para /orcamentos/novo com state.orcamento = novoOrcamento
```

---

#### 2. Adicionar botao de copia na UI

Em cada aba de orcamentos (pendente, aprovado, finalizado, rejeitado), adicionar o botao logo apos o botao de "Vincular" (icone Link2):

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => copiarOrcamento(item)}
  title={t('orcamentos.copyQuote')}
>
  <Copy className="h-4 w-4" />
</Button>
```

O botao usara o icone `Copy` que ja esta importado no arquivo (linha 14).

---

#### 3. Ordem dos botoes nas cards

A nova ordem dos botoes sera:
1. Vincular (Link2) - existente
2. **Copiar (Copy)** - novo
3. Precificacao (DollarSign) - existente
4. Editar (Edit) - existente
5. Download (Download) - existente
6. Reprovar (X) - existente (apenas em pendentes)
7. Aprovar (Check) - existente (apenas em pendentes)

---

### Alteracoes no arquivo `src/i18n/translations.ts`

Adicionar novas chaves de traducao:

**Portugues (pt-BR):**
```typescript
copyQuote: 'Copiar Orçamento',
copyQuoteSuccess: 'Orçamento copiado com sucesso',
copyQuoteError: 'Erro ao copiar orçamento',
```

**Ingles (en):**
```typescript
copyQuote: 'Copy Quote',
copyQuoteSuccess: 'Quote copied successfully',
copyQuoteError: 'Error copying quote',
```

---

### Detalhes Tecnicos

#### Campos que serao copiados do orcamento original:
- `cliente_id`, `cliente_nome`
- `equipamento`
- `valor`, `desconto_percentual`
- `condicao_pagamento`, `prazo_entrega`, `prazo_pagamento`
- `garantia`, `validade_proposta`, `frete`
- `assunto_proposta`, `descricao`, `observacoes`, `observacoes_nota`
- `numero_nota_entrada`
- `empresa_id`
- Campos de precificacao: `impostos_percentual`, `comissao_percentual`, `margem_contribuicao`, `custos_variaveis`, `percentuais_customizados`, `preco_desejado`, `total_custos_variaveis`, `percentual_margem`, `impostos_valor`, `comissao_valor`

#### Campos que NAO serao copiados (resetados):
- `id` - novo UUID gerado automaticamente
- `numero` - novo numero sequencial
- `ordem_referencia` - **nao copiar**
- `ordem_servico_id` - **nao vincular**
- `status` - sempre `pendente`
- `data_criacao` - data atual
- `data_aprovacao` - nulo
- `data_aprovacao_gestor` - nulo
- `aprovado_por_gestor` - nulo
- `numero_nf` - nulo
- `pdf_nota_fiscal` - nulo
- `forma_pagamento` - nulo
- `data_negociacao`, `status_negociacao`, `data_vencimento` - nulos

#### Itens copiados (`itens_orcamento`):
- `tipo`, `descricao`, `codigo`, `quantidade`, `valor_unitario`, `valor_total`, `detalhes`
- Com novo `orcamento_id` referenciando o novo orcamento

#### Fotos copiadas (`fotos_orcamento`):
- `url`, `nome_arquivo`, `legenda`, `apresentar_orcamento`
- Com novo `orcamento_id` referenciando o novo orcamento

---

### Resultado Esperado

1. Ao clicar no botao "Copiar" em qualquer orcamento:
   - Uma copia completa e criada no banco de dados
   - A tela de edicao abre com o novo orcamento
   - O usuario pode editar qualquer campo antes de salvar
   - O campo "Ordem Referencia" estara vazio (nao copiado)
   - Todas as pecas, servicos, usinagem e fotos estarao pre-carregadas
