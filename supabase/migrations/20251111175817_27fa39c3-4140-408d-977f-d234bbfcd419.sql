-- Deletar histórico de itens de orçamento
DELETE FROM historico_itens_orcamento 
WHERE historico_orcamento_id IN (
  SELECT id FROM historico_orcamentos 
  WHERE orcamento_id IN (
    '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
    '7a3e5b5d-0813-4720-8593-34553bbcf30c',
    '704b4432-8958-4684-a67c-b048d8ab283a',
    'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
  )
);

-- Deletar histórico de orçamentos
DELETE FROM historico_orcamentos 
WHERE orcamento_id IN (
  '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
  '7a3e5b5d-0813-4720-8593-34553bbcf30c',
  '704b4432-8958-4684-a67c-b048d8ab283a',
  'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
);

-- Deletar histórico de precificação
DELETE FROM historico_precificacao 
WHERE orcamento_id IN (
  '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
  '7a3e5b5d-0813-4720-8593-34553bbcf30c',
  '704b4432-8958-4684-a67c-b048d8ab283a',
  'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
);

-- Deletar itens de orçamento
DELETE FROM itens_orcamento 
WHERE orcamento_id IN (
  '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
  '7a3e5b5d-0813-4720-8593-34553bbcf30c',
  '704b4432-8958-4684-a67c-b048d8ab283a',
  'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
);

-- Deletar fotos de orçamento
DELETE FROM fotos_orcamento 
WHERE orcamento_id IN (
  '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
  '7a3e5b5d-0813-4720-8593-34553bbcf30c',
  '704b4432-8958-4684-a67c-b048d8ab283a',
  'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
);

-- Deletar os orçamentos
DELETE FROM orcamentos 
WHERE id IN (
  '6aaad0b8-885f-4393-9528-6524a9ca5fb8',
  '7a3e5b5d-0813-4720-8593-34553bbcf30c',
  '704b4432-8958-4684-a67c-b048d8ab283a',
  'ddbfa6b6-998d-4ae9-8c4e-50cfd4e606cd'
);