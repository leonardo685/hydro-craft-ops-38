# Memory: features/dfc-hierarquia-categorias
Updated: now

No extrato da página DFC, o filtro de categoria agora é hierárquico. Ao selecionar uma categoria pai (tipo 'mae'), o sistema inclui automaticamente todos os lançamentos da categoria selecionada e de todas as suas categorias filhas vinculadas (onde o 'categoriaMaeId' corresponde ao ID do pai). A seleção de uma categoria filha individual continua filtrando apenas os dados específicos dessa subcategoria.

## Implementação técnica

1. A função `getCategoriasFilhasIds` (useMemo) identifica se uma categoria é do tipo 'mae' e retorna um array contendo:
   - O ID da categoria mãe
   - Todos os IDs das categorias filhas vinculadas

2. O array de categorias permitidas é pré-calculado via `categoriasPermitidasExtrato` (useMemo) baseado no filtro selecionado, evitando recálculos durante o loop de filtragem.

3. A filtragem verifica se `item.categoriaId` está presente no array de categorias permitidas.
