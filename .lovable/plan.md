# Restaurar o acesso ao sistema (limite de armazenamento)

## Situação confirmada agora

O banco continua respondendo às minhas consultas e **nenhum dado foi perdido**. O que está bloqueando o app é o volume de arquivos guardados:

| Pasta de arquivos | Arquivos | Espaço | Mais de 4 meses |
| --- | --- | --- | --- |
| Vídeos de teste | 143 | 9,30 GB | 85 arquivos (5,51 GB) |
| Fotos de equipamentos | 2.386 | 3,78 GB | 1.805 arquivos (2,86 GB) |
| Documentos | 179 | 0,01 GB | 118 arquivos |
| Documentos técnicos | 62 | 0,01 GB | 62 arquivos |

Total: cerca de **13,1 GB**. Como você não consegue entrar no painel do provedor para aumentar o espaço, o caminho viável é reduzir o espaço usado por aqui, apagando arquivos antigos de mídia (os cadastros, ordens, orçamentos e lançamentos permanecem intactos).

## O que eu faço

1. **Relatório antes de apagar**: listo, por ordem de serviço e por data, todos os vídeos e fotos candidatos à exclusão, para você conferir e vetar o que quiser manter.
2. **Limpeza em etapas**, sempre começando pelos mais antigos:
   - Etapa A: vídeos de teste com mais de 4 meses (libera ~5,5 GB).
   - Etapa B: fotos de equipamentos com mais de 4 meses (libera ~2,9 GB).
   - Etapa C: se ainda faltar espaço, avanço para vídeos com mais de 2 meses.
   Depois de cada etapa eu meço o espaço restante e te informo.
3. **Registro do que saiu**: cada ordem afetada fica com uma anotação de que o vídeo/foto foi removido por espaço, com a data, para não parecer que o arquivo simplesmente desapareceu.
4. **Verificação final**: confirmo que o app volta a abrir e que as telas de ordens, orçamentos e financeiro carregam normalmente.

## Para não repetir

5. **Compressão automática das fotos** no momento do upload (redução grande de tamanho, sem perda visível).
6. **Aviso de espaço** dentro do app quando o total de arquivos passar de um limite, para agirmos antes de bloquear.
7. **Regra de retenção de vídeos**: vídeos de teste com mais de X meses são removidos automaticamente (você define o X; sugiro 4 meses).

## Duas decisões suas antes de eu começar

- **Retenção de vídeos**: apagar os com mais de 4 meses (sugestão) ou outro prazo.
- **Baixar antes de apagar**: se quiser guardar os vídeos fora do sistema, me diga — eu gero uma lista de links para você baixar antes da exclusão. Depois de apagados não há recuperação.

## Detalhes técnicos

- Exclusão via `storage.objects` nos buckets `videos-teste` e `equipamentos`, em lotes, com contagem/soma de bytes antes e depois de cada lote.
- Limpeza das referências correspondentes nas colunas de mídia de `testes_equipamentos` e `recebimentos`/`ordens_servico`, evitando links quebrados na interface.
- Nenhuma alteração de schema, RLS ou dados de negócio.
- Compressão de imagem no cliente antes do upload (canvas/`toBlob`, lado maior limitado e qualidade ~0,8), aplicada nos pontos de upload de fotos de equipamento.
