

# Correcao: Erro 413 no upload resumivel TUS

## Problema

A opcao `uploadDataDuringCreation: true` envia dados do video junto com a requisicao POST de criacao do upload TUS. Isso faz a requisicao inicial ultrapassar o limite do gateway HTTP, resultando em erro 413 "Maximum size exceeded" antes mesmo do upload em chunks comecar.

## Solucao

Desabilitar `uploadDataDuringCreation` para que a requisicao POST de criacao seja leve (apenas metadados), e os dados sejam enviados separadamente via PATCH em chunks de 6MB.

## Alteracao

### Arquivo: `src/components/UploadVideoTesteModal.tsx`

Linha 168 - mudar `uploadDataDuringCreation` de `true` para `false`:

```typescript
// Antes:
uploadDataDuringCreation: true,

// Depois:
uploadDataDuringCreation: false,
```

Isso garante que:
1. O POST inicial cria apenas a sessao de upload (sem dados, requisicao pequena)
2. Os dados sao enviados em chunks de 6MB via PATCH (requisicoes subsequentes)
3. O upload resumivel funciona corretamente para arquivos grandes

Nenhuma outra alteracao necessaria.

