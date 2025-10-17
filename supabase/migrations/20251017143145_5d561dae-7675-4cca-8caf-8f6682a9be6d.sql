-- Inserir role de admin para o usuário leonardo@mechidro.com.br
INSERT INTO public.user_roles (user_id, role)
VALUES ('bbc36852-752f-49b7-ab6f-2b5d2ce60e7b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;