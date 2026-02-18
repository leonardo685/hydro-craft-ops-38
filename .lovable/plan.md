

# Correção: Lançamentos financeiros "sumidos" (limite de 1000 rows)

## Problema Identificado

A empresa **mec-hidro** possui **1.090 lançamentos financeiros** no banco de dados. O Supabase/PostgREST tem um limite padrão de **1.000 registros** por consulta. Como a query ordena por `data_esperada DESC` (mais recentes primeiro), os **90 lançamentos mais antigos ficam de fora** -- exatamente os do periodo 01/11 a 10/11/2025.

Os dados **nao foram deletados**, apenas nao aparecem no app por causa desse limite.

## Solucao

Modificar o hook `useLancamentosFinanceiros` para buscar os dados em lotes (paginacao interna), garantindo que **todos** os registros sejam carregados independente da quantidade.

## Alteracoes Tecnicas

### Arquivo: `src/hooks/use-lancamentos-financeiros.ts`

Na funcao `fetchLancamentos`, substituir a query unica por um loop de paginacao:

```text
Antes:
  supabase.from('lancamentos_financeiros')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_esperada', { ascending: false })
  // Retorna no maximo 1000 registros

Depois:
  Loop buscando em lotes de 1000:
    - Pagina 0: range(0, 999)
    - Pagina 1: range(1000, 1999)
    - ... ate nao ter mais dados
  Concatenar todos os resultados
```

A logica sera:

1. Buscar a primeira pagina (0-999)
2. Se retornou exatamente 1000 registros, buscar a proxima pagina
3. Repetir ate receber menos de 1000 registros
4. Concatenar todos os resultados

Nenhuma outra parte do codigo precisa mudar -- as paginas de DFC, Financeiro, DRE etc. continuarao funcionando normalmente pois consomem o array `lancamentos` que agora tera todos os registros.

