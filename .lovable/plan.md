# Follow Up — MEC HYDRO USA

## Objetivo

Adicionar acompanhamento por equipamento na empresa americana, com atualizações revisadas, fotos, vídeos e notificações por e-mail, usando o QR Code e as páginas atuais. A empresa brasileira continuará funcionando como hoje. Toda a nova interface será em inglês.

## O que será reaproveitado

- Seleção de destinatários do Comercial, incluindo os e-mails principal e adicionais do cliente.
- Gravação, transcrição e organização por IA dos Technical Reports, mantendo o comportamento atual desses laudos.
- Envio Gmail SMTP, logo e assinatura corporativa dos e-mails comerciais, sem exigir um PDF para Follow Up.
- Link atual do QR Code, página de acompanhamento, acesso ao laudo após a conclusão e padrão visual existente.

Os 31 testes existentes de capacidades por empresa, e-mail comercial e seleção de destinatários passaram na análise inicial. Isso não valida ainda o novo Follow Up.

## 1. Ativação por serviço

- Após salvar um recebimento ou uma nova ordem americana, apresentar: **Would you like to enable follow-up for this service?**
- Mostrar os contatos do cliente correspondente e permitir selecionar um ou mais destinatários. Não selecionar destinatários automaticamente, seguindo o padrão do Comercial.
- **Confirm** salva a ativação e solicita o envio inicial. **Cancel** segue o fluxo atual sem ativar nem enviar e-mail.
- Permitir ativação posterior, edição dos destinatários e desativação dentro do serviço.
- Cada equipamento/serviço terá sua própria seleção; não haverá ativação global por cliente.

**Preservação do fluxo:** hoje um recebimento pode existir antes da ordem de serviço. A ativação ficará vinculada ao recebimento nesse intervalo e será associada à ordem correspondente quando ela for criada, sem antecipar a análise, duplicar ordens ou repetir o e-mail inicial. Ordens diretas e antigas terão o mesmo gerenciamento.

**Desativação:** interrompe novas notificações, mas preserva o histórico já publicado. Rascunhos continuam privados.

## 2. Registro e revisão

- Formulário móvel com texto, microfone, múltiplas fotos e múltiplos vídeos, incluindo câmera e galeria.
- A mesma tecnologia dos Technical Reports organizará texto ou áudio em inglês técnico, sem inventar informações, diagnósticos, serviços, resultados ou prazos.
- O funcionário poderá revisar e editar o resultado antes de salvar como **Draft** ou aprovar e publicar como **Published**.
- Rascunhos não aparecerão ao cliente e não enviarão e-mail.
- Publicação registra data, horário e responsável, com proteção contra cliques repetidos e publicação duplicada.

## 3. QR Code e Service Updates

- Manter o QR Code e as páginas atuais; não criar outra página de acompanhamento.
- Inserir **Service Updates** abaixo do status atual, sem remover a linha de etapas existente.
- Mostrar publicações da mais recente para a mais antiga, com data/hora, texto, fotos ampliáveis e vídeos reproduzíveis.
- Reutilizar a seção também na experiência após a conclusão, para que o histórico continue acessível pelo mesmo QR Code.
- Fotos de Follow Up não serão usadas como fotos de teste/conclusão: isso evita que uma foto de progresso faça o QR Code tratar um serviço em andamento como concluído.

## 4. E-mails e gerenciamento

- Enviar o aviso inicial com cliente, equipamento, identificação disponível, número MH-XXX-YY, recebimento, status, imagem do QR Code e link atual.
- Após cada publicação, enviar o texto publicado, status e link aos destinatários salvos para aquele serviço. Informar a existência de fotos/vídeos sem anexar arquivos pesados.
- Mostrar ativação, destinatários, última atualização, quantidade de atualizações, rascunhos, publicações e histórico de notificações.
- Falhas de envio não removerão publicações. Permitir reenviar notificações que falharam sem republicar a atualização.
- Separar os indicadores do Follow Up dos indicadores de envio de Quote/Invoice.
- Quando houver dúvida se o Gmail aceitou um envio interrompido, mostrar essa situação para revisão, sem reenviar automaticamente e arriscar duplicação.

## 5. Privacidade e isolamento

- Validar empresa, cliente e serviço no servidor, não apenas na tela.
- Limitar gerenciamento aos usuários internos autorizados da empresa americana, reutilizando o controle de acesso existente.
- Disponibilizar ao cliente somente publicações e arquivos do serviço consultado; nunca destinatários, rascunhos ou informações internas.
- Armazenar mídias em área privada do Supabase Storage. Os espaços atuais de fotos/vídeos são públicos e não protegem rascunhos; será necessária uma área privada própria no mesmo serviço.
- Validar a identidade do serviço e da empresa ao consultar novas atualizações pelo QR Code. Quando um QR antigo não identificar a empresa e houver números duplicados, não escolher arbitrariamente o histórico de outra empresa.
- Não alterar os dados ou os processos brasileiros nem a geração dos números de ordem.

## Detalhes técnicos

- Adicionar a capacidade `supportsFollowUp` em `src/lib/company-features.ts`, com validação equivalente no servidor.
- Extrair um seletor compartilhado de destinatários a partir do Comercial e reutilizá-lo sem modificar o comportamento dos envios comerciais.
- Criar registros de acompanhamento, atualizações, mídias e notificações com propriedade por empresa e referência ao recebimento/ordem. Associar o recebimento à ordem de forma transacional e idempotente.
- Usar políticas de acesso e permissões explícitas para as novas tabelas. A publicação e a criação do evento de notificação ocorrerão numa mesma transação, com chave única por evento.
- Reaproveitar o transporte SMTP/MIME e a assinatura em helpers compartilhados; construir mensagens a partir de dados persistidos e autorizados, não de nomes/links enviados livremente pelo navegador.
- Estender a IA de Technical Reports com modo Follow Up validado, entrada de texto e saída obrigatoriamente em inglês, preservando o modo atual de laudos.
- Disponibilizar uma consulta pública restrita a conteúdo publicado e links temporários de mídia autorizada. Nunca liberar leitura pública das configurações internas.
- Reutilizar o upload retomável de vídeos e comprimir fotos para celular, respeitando os limites do Storage.
- Notificações terão identificação única, estados de envio e controle de concorrência. O envio SMTP não é atomicamente confirmável junto com o banco; falhas ambíguas serão tratadas separadamente.

## Validação antes de concluir

- Brasil sem Follow Up e sem alterações nos fluxos existentes.
- Recebimento antes da ordem, ordem direta e ativação posterior em ordens antigas.
- Cancel sem ativação/envio; destinatários independentes para dois serviços do mesmo cliente.
- Texto e áudio em português/inglês gerando revisão em inglês, sem publicação automática.
- Rascunhos e arquivos inacessíveis publicamente; isolamento entre empresas com o mesmo número de ordem.
- Publicação concorrente sem duplicação; falha/reenvio sem duplicar publicação.
- Timeline com fotos/vídeos em celular e computador, antes e depois da conclusão.
- Envio inicial e atualização com recebimento real confirmado, para destinatário de teste autorizado.

**Limite conhecido:** a sessão automática de teste não está disponível neste Supabase externo. Se isso continuar, os testes autenticados e de envio real serão apresentados como pendentes, não como aprovados.

## Detalhe ainda necessário

O documento não identifica qual botão deve ser renomeado. A pergunta para indicar a tela/botão ou enviar uma imagem já está aberta. A substituição ficará pendente até essa identificação, sem remover uma ação existente por suposição.