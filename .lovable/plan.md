# Reconectar o app ao banco (bloqueio por armazenamento)

## O que testei agora

- Consulta direta ao banco: **funciona**. Os dados estão lá (263 ordens, 339 orçamentos).
- Endereço que o app usa para ler dados e para login: **bloqueado**, com a resposta "Service for this project is restricted... exceed_storage_size_quota".

Ou seja: nada foi perdido, mas enquanto o provedor mantiver o bloqueio por excesso de armazenamento, o app não abre nem deixa entrar — inclusive a tela de login.

## Espaço ocupado hoje (cerca de 13,1 GB)

| Pasta de arquivos | Arquivos | Espaço | Com mais de 4 meses |
| --- | --- | --- | --- |
| Vídeos de teste | 143 | 9,30 GB | 85 (5,51 GB) |
| Fotos de equipamentos | 2.386 | 3,78 GB | 1.805 (2,86 GB) |
| Documentos | 179 | 0,01 GB | 118 |
| Documentos técnicos | 62 | 0,01 GB | 62 |

## Caminho A — aumentar o espaço no provedor (mais rápido e sem perder nada)

Depende de você recuperar o acesso à conta do provedor. Enquanto isso não acontece, o bloqueio continua. Se preferir esse caminho, eu não mexo em nada e você resolve o acesso/pagamento; assim que liberar, eu confirmo que o app voltou.

## Caminho B — reduzir o espaço por aqui

Como o serviço de arquivos também está bloqueado, só consigo remover os registros dos arquivos pelo banco. Aviso honesto: isso limpa o app e as listagens, mas **não há garantia de que o provedor recalcule o consumo e libere o bloqueio sozinho** — pode ser necessário abrir um pedido de recálculo com o suporte deles. Não vou prometer que o app volta só com isso.

Etapas, se você aprovar:

1. Relatório para conferência: lista de vídeos e fotos candidatos, por ordem de serviço e data, para você vetar o que quiser manter.
2. Remoção em lotes, do mais antigo para o mais recente, medindo o espaço restante depois de cada lote e te informando.
3. Limpeza das referências nas ordens, para não sobrar link quebrado nas telas.
4. Novo teste do endereço de dados e de login, para dizer com certeza se o bloqueio caiu.
5. Se não cair: eu preparo o texto do pedido de recálculo para o suporte do provedor, com o código do projeto.

## Prevenção (depois que voltar)

- Compressão automática das fotos no envio.
- Aviso dentro do app quando o total de arquivos chegar perto do limite.
- Regra de retenção de vídeos (sugestão: 4 meses).

## Detalhes técnicos

- Verificação feita: `SELECT` direto no banco (OK) e `curl` em `/rest/v1` e `/auth/v1/health` → HTTP 402 `exceed_storage_size_quota`.
- Caminho B: `DELETE` em lotes de `storage.objects` para `videos-teste` e `equipamentos` filtrando `created_at`, com `count`/`sum(metadata->>'size')` antes e depois; limpeza das colunas de mídia em `testes_equipamentos`, `recebimentos` e `ordens_servico`.
- A API de Storage está inacessível (402), então objetos físicos podem permanecer no bucket como órfãos até o provedor reconciliar.
- Sem mudanças de schema, RLS ou dados de negócio.
