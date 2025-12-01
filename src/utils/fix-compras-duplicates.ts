import { supabase } from "@/integrations/supabase/client";

// Script temporário para remover duplicatas na tabela compras
// Execute este script uma vez e depois delete este arquivo

export const fixComprasDuplicates = async () => {
  console.log("Iniciando limpeza de duplicatas...");

  // IDs duplicados para deletar (mantendo apenas o mais antigo de cada grupo)
  const idsToDelete = [
    'ca391856-023c-41d3-bdc4-f39fd8cef085',
    '75aebb1f-040a-49a4-a447-33b85a51c1a4',
    '4035e8a6-67d2-49bb-931e-3c28002b61d4',
    '0d397310-8e4e-40f6-b37c-eb9405ec8ca2',
    '3d6a8bcc-58d7-41cf-9092-0cd722233906',
    'cdfe4044-58a2-4406-98b2-71ea378625c7',
    'a2a06204-b6e9-4bec-a90d-38a577af0f9d',
    '43d6455a-ecbc-4aad-96ab-4b02fda38fc4',
    '453aa928-feb4-4305-8454-5f70ad553017',
    '823e5075-801e-49c6-9aae-3792f78f1d28',
    '38ecee95-bc26-4eaf-a38e-586e18d56f84',
    '3d2d19d3-d527-4e73-9cda-7ce71b4de19e',
    '8734e5ac-fcee-4eb3-9e57-897a33d9c327',
    'ecff5550-8008-4b1c-abd1-45a6fb0606bd',
    '622d2359-c900-4b4c-8b54-436b5c466e81'
  ];

  for (const id of idsToDelete) {
    const { error } = await supabase
      .from('compras')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao deletar ${id}:`, error);
    } else {
      console.log(`✓ Deletado: ${id}`);
    }
  }

  console.log("Limpeza concluída! Agora aplique a migração de constraint.");
  return { success: true, deletedCount: idsToDelete.length };
};
