# Tax por orçamento

## US fiscal workflow removal
- [ ] Remove US fiscal billing navigation, entry/return/fiscal invoice controls, and return-invoice completion dependency; retain Brazil and existing records.
- [ ] Run isolation tests and verify accessible UI; report authenticated testing limits.

## QR no PDF do orçamento
- [x] Adicionar QR sem logo e número abaixo ao lado do título somente para referência única existente da empresa.
- [x] Validar visualmente PDFs de teste com QR, título longo e ausência do QR para referências vazias, inexistentes ou múltiplas; sem cortes ou sobreposições.

- [x] Remover a opção de isenção do cadastro do cliente.
- [x] Salvar com/sem tax por orçamento e preservar cópias e revisões.
- [x] Usar a escolha do orçamento em todas as exportações modernas.
- [x] Validar PDFs com tax e sem tax (8,5% e 0%); compilação OK.
- [ ] Confirmar salvar/reabrir na sessão do usuário — sessão autenticada indisponível para testes externos.