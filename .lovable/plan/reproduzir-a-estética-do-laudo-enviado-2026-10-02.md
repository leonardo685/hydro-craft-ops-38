# Reproduzir a estética do laudo enviado

## Resultado
O PDF do laudo passará a usar o mesmo desenho visual do arquivo de referência, mantendo os dados reais, traduções e fotos de cada ordem.

## Alterações
- Refazer o cabeçalho com logo à esquerda, dados da empresa à direita e divisória fina.
- Reorganizar a primeira página com título, equipamento, cliente, resultado destacado, parâmetros em grade aberta e Leak Checks em linhas.
- Criar a página “Technical scope” com Findings logo no início, dados do equipamento em colunas, peças, serviços e usinagem sem caixas pesadas.
- Padronizar páginas de fotos em duas colunas, com fundo cinza-claro, proporção preservada, legenda e continuação automática.
- Reproduzir rodapés com ordem, nome da seção e página em vermelho.
- Manter PT-BR, inglês e espanhol conforme o idioma selecionado, além de ocultar blocos sem dados.

## Detalhes técnicos
- A geração continuará em PDF pelo botão atual e usando os campos existentes.
- O conteúdo será paginado por seções para evitar cortes, sobreposição e quebra incoerente de linhas.
- O laudo técnico ficará abaixo de Leak Checks, conforme solicitado, iniciando a seção técnica quando necessário.
- O resultado será validado visualmente contra as quatro páginas do modelo enviado.
