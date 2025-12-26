-- Atualizar email do usuário na tabela auth.users
UPDATE auth.users 
SET email = 'support@mechydro.com', 
    email_confirmed_at = now()
WHERE id = 'e34ca0e0-fdee-4f51-8133-6cce96d5fd94';

-- Atualizar também na tabela profiles se existir
UPDATE public.profiles 
SET email = 'support@mechydro.com'
WHERE id = 'e34ca0e0-fdee-4f51-8133-6cce96d5fd94';