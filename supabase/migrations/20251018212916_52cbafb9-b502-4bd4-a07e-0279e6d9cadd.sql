-- Configurar URL do webhook n8n
INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES ('webhook_n8n_url', 'https://leoberto1.app.n8n.cloud/webhook-test/01607294-b2b4-4482-931f-c3723b128d7d')
ON CONFLICT (chave) 
DO UPDATE SET 
  valor = 'https://leoberto1.app.n8n.cloud/webhook-test/01607294-b2b4-4482-931f-c3723b128d7d',
  updated_at = now();