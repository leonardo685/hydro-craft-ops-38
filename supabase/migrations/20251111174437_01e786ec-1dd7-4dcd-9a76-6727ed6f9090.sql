-- Deletar histórico de itens de orçamento
DELETE FROM historico_itens_orcamento 
WHERE historico_orcamento_id IN (
  SELECT id FROM historico_orcamentos 
  WHERE orcamento_id IN (
    '73f6ddc0-7683-4ed5-9795-f013b719f271',
    'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
    '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
    '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
    'fad6e9dd-e759-4a82-989c-3e5126e5d798',
    'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
  )
);

-- Deletar histórico de orçamentos
DELETE FROM historico_orcamentos 
WHERE orcamento_id IN (
  '73f6ddc0-7683-4ed5-9795-f013b719f271',
  'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
  '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
  '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
  'fad6e9dd-e759-4a82-989c-3e5126e5d798',
  'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
);

-- Deletar histórico de precificação
DELETE FROM historico_precificacao 
WHERE orcamento_id IN (
  '73f6ddc0-7683-4ed5-9795-f013b719f271',
  'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
  '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
  '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
  'fad6e9dd-e759-4a82-989c-3e5126e5d798',
  'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
);

-- Deletar itens de orçamento
DELETE FROM itens_orcamento 
WHERE orcamento_id IN (
  '73f6ddc0-7683-4ed5-9795-f013b719f271',
  'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
  '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
  '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
  'fad6e9dd-e759-4a82-989c-3e5126e5d798',
  'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
);

-- Deletar fotos de orçamento
DELETE FROM fotos_orcamento 
WHERE orcamento_id IN (
  '73f6ddc0-7683-4ed5-9795-f013b719f271',
  'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
  '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
  '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
  'fad6e9dd-e759-4a82-989c-3e5126e5d798',
  'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
);

-- Deletar os orçamentos
DELETE FROM orcamentos 
WHERE id IN (
  '73f6ddc0-7683-4ed5-9795-f013b719f271',
  'c18d5e91-c6a5-442e-af48-c2e3d6fa4cef',
  '09c8e11d-0d87-422e-a77e-5a0c3e94ddd9',
  '12c83e94-1a52-4d6a-a18d-fb83fbaa8dd1',
  'fad6e9dd-e759-4a82-989c-3e5126e5d798',
  'a4e5c03c-cb60-4daa-b51b-20bfebc9dc75'
);