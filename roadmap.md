# Tax por orçamento

## Correção de Techs para Sales Tax
- [x] Remover valor manual dos técnicos e mostrar Sales Tax calculado nos cards e no total superior apenas na MEC HYDRO.
- [ ] Validar cálculos e verificar a página; acesso autenticado externo pode limitar a verificação real.

## US fiscal workflow removal
- [x] Remove US fiscal billing navigation, entry/return/fiscal invoice controls, and return-invoice completion dependency; retain Brazil and existing records.
- [x] Run isolation and layout tests; compilation OK. Authenticated end-to-end verification unavailable with external Supabase.

## QR no PDF do orçamento
- [x] Adicionar QR sem logo e número abaixo ao lado do título somente para referência única existente da empresa.
- [x] Validar visualmente PDFs de teste com QR, título longo e ausência do QR para referências vazias, inexistentes ou múltiplas; sem cortes ou sobreposições.

- [x] Remover a opção de isenção do cadastro do cliente.
- [x] Salvar com/sem tax por orçamento e preservar cópias e revisões.
- [x] Usar a escolha do orçamento em todas as exportações modernas.
- [x] Validar PDFs com tax e sem tax (8,5% e 0%); compilação OK.
- [ ] Confirmar salvar/reabrir na sessão do usuário — sessão autenticada indisponível para testes externos.