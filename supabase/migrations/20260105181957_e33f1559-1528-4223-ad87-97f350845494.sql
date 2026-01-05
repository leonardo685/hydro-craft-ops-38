UPDATE ordens_servico 
SET status = 'pendente', 
    updated_at = NOW()
WHERE id IN (
  '2110dd2f-884a-4395-ae57-faac85c03847',
  '7b817d79-ad45-4c26-b5c1-37aff66be43f'
);