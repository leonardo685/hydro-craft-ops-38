
# Atualização de Datas das Ordens de Serviço

## Dados a Atualizar

| Ordem | Entrada Atual | Nova Entrada | Saída Atual | Nova Saída |
|-------|---------------|--------------|-------------|------------|
| MH-002-25 | 26/12/2025 | **20/11/2025** | 31/01/2026 | **01/12/2025** |
| MH-003-25 | 01/02/2026 | **20/12/2025** | 03/01/2026 | **30/12/2025** |
| MH-001-26 | 05/01/2026 | **03/01/2026** | 31/01/2026 | **05/01/2026** |
| MH-002-26 | 31/01/2026 | **29/01/2026** | 31/01/2026 | **03/02/2026** |

## Operação

Executar 4 comandos UPDATE na tabela `ordens_servico` para atualizar os campos:
- `data_entrada`: Data de entrada/recebimento do equipamento
- `data_finalizacao`: Data de saída/finalização do serviço

## Queries SQL a Executar

```sql
-- MH-002-25
UPDATE ordens_servico 
SET data_entrada = '2025-11-20', data_finalizacao = '2025-12-01' 
WHERE id = 'd571ab93-237a-4c1f-9730-f4b99179e56a';

-- MH-003-25
UPDATE ordens_servico 
SET data_entrada = '2025-12-20', data_finalizacao = '2025-12-30' 
WHERE id = '1eea3e8d-9048-41f7-8881-729f6ebbfcfc';

-- MH-001-26
UPDATE ordens_servico 
SET data_entrada = '2026-01-03', data_finalizacao = '2026-01-05' 
WHERE id = '76f7b0b5-a1ff-438f-8783-79875af5b8ee';

-- MH-002-26
UPDATE ordens_servico 
SET data_entrada = '2026-01-29', data_finalizacao = '2026-02-03' 
WHERE id = 'b640a132-4d40-4b24-9324-264d6c69a2a7';
```

## Resultado Esperado

Após as atualizações, o histórico de manutenção mostrará a sequência cronológica correta:
1. MH-002-25: Nov/2025 → Dez/2025
2. MH-003-25: Dez/2025 → Dez/2025  
3. MH-001-26: Jan/2026 → Jan/2026
4. MH-002-26: Jan/2026 → Fev/2026
