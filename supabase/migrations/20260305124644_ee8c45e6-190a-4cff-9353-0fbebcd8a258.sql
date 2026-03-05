-- Fix duplicate MH-043-26: rename the two newer copies to MH-047-26 and MH-048-26
UPDATE ordens_servico SET numero_ordem = 'MH-047-26', updated_at = now() WHERE id = '1d40dbec-c841-4a44-a6a1-bcfbcd6a93cf';
UPDATE ordens_servico SET numero_ordem = 'MH-048-26', updated_at = now() WHERE id = '825aa0b3-f79b-484a-b2ed-70cc94885323';