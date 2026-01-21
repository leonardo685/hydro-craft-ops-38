-- Limpar fotos duplicadas existentes para a ordem MH-013-26
DELETE FROM fotos_equipamentos a
USING fotos_equipamentos b
WHERE a.id > b.id
AND a.arquivo_url = b.arquivo_url
AND COALESCE(a.recebimento_id::text, '') = COALESCE(b.recebimento_id::text, '')
AND COALESCE(a.ordem_servico_id::text, '') = COALESCE(b.ordem_servico_id::text, '');