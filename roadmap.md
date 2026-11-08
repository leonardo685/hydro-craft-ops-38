# Tax por orçamento

## Assinatura de entrega
- [ ] Capturar assinatura no celular e salvar com data na ordem, mesmo sem aprovação ou P.O.
- [ ] Incluir assinatura e data ao final do Invoice da ordem e empresa correspondentes.
- [ ] Validar captura e PDF; confirmar salvamento real se houver sessão disponível.

## Email conjunto por P.O.
- [x] Oferecer seleção de invoices Approved/Finalized com o mesmo P.O. e enviar apenas as escolhidas, com números e assuntos na mensagem.
- [x] Validar envio individual e conjunto, isolamento e fotos com 20 testes; compilação sem erros.
- [ ] Confirmar envio real — sessão autenticada indisponível no Supabase externo.

## Vincular ordem em Finalized
- [x] Adicionar botão de vínculo nas quotes Finalized da MEC HYDRO reutilizando a seleção de ordens existente, sem alterar a empresa brasileira.
- [ ] Verificar abertura e salvamento na conta — sessão autenticada indisponível no Supabase externo.

## Email nas abas do Comercial
- [x] Usar o mesmo envio e mensagem formatada nas abas permitidas; Approved e Finalized enviam Invoice e Reproved não permite envio.
- [x] Validar tipo e disponibilidade: 8 testes passaram e compilação OK; envio real não verificado por falta de sessão no Supabase externo.

## Exclusão de orçamentos rejeitados
- [x] Adicionar exclusão confirmada nos rejeitados e retirar orçamento excluído das contagens e somas.
- [x] Validar exclusão e isolamento: 16 testes passaram, compilação OK e acesso público à função bloqueado.
- [ ] Confirmar exclusão real na conta — sessão autenticada indisponível no Supabase externo.

## Foto de entrega no invoice americano
- [x] Incluir fotos das ordens finalizadas no invoice correspondente, mantendo P.O. primeiro e isolamento entre empresas.
- [x] Validar seleção com 12 testes e exportar PDF de exemplo com foto; compilação sem erros.
- [ ] Confirmar exportação com foto real — sessão autenticada indisponível no Supabase externo.

## Correção de Techs para Sales Tax
- [x] Remover valor manual dos técnicos e mostrar Sales Tax calculado nos cards e no total superior apenas na MEC HYDRO.
- [x] Validar cálculos: 15 testes passaram e compilação sem erros.
- [ ] Verificar cards com dados reais — acesso autenticado indisponível no Supabase externo; página redirecionou para login sem erros.

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
## Lista de precificações
- [x] Criar tabela precificacoes com isolamento por empresa e transformar a página em lista com botão "Nova precificação", edição, exclusão e salvamento no modal.
- [x] Compilação OK; salvamento real não verificado por falta de sessão autenticada no Supabase externo.
