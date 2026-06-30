## Histórico de Ações com Undo (admin)

Criar um sistema de auditoria que **registra ações reversíveis** dos usuários e permite **apenas ao admin desfazê-las**. Começando com a aprovação de orçamento / ordem de serviço (voltar para "aguardando aprovação" = `orcamentos.status = 'pendente'`).

### 1. Banco (migração)

Tabela nova `public.acoes_reversiveis`:

- `id uuid pk`
- `empresa_id uuid` (multi-tenant)
- `user_id uuid` (quem executou)
- `user_nome text`, `user_email text` (snapshot p/ exibir mesmo se usuário sair)
- `tipo text` — começa com `'orcamento_aprovado'`
- `descricao text` — ex: "Aprovou orçamento ORC-012-26 (Cliente X)"
- `entidade_principal_tipo text`, `entidade_principal_id text`
- `estado_anterior jsonb` — snapshot dos campos que serão restaurados (status do orçamento + status/`valor_estimado`/`orcamento_id` da OS vinculada + campos de aprovação)
- `estado_novo jsonb` — para auditoria
- `desfeita boolean default false`, `desfeita_em timestamptz`, `desfeita_por uuid`
- `created_at`, `updated_at`

Grants + RLS:
- `SELECT` apenas para `admin` (`has_role(auth.uid(),'admin')`) e filtrado por `empresa_id` do usuário.
- `INSERT` para `authenticated` (qualquer usuário pode registrar suas próprias ações).
- `UPDATE` apenas `admin` (para marcar como desfeita).
- `DELETE` bloqueado.

### 2. Registro da ação

Em `src/components/AprovarOrcamentoModal.tsx`, após sucesso da aprovação, gravar uma linha em `acoes_reversiveis` com:

```
estado_anterior = {
  orcamento: { status: <antes>, data_aprovacao, valor, prazo_pagamento, data_vencimento, numero_pedido, descricao },
  ordem_servico: { id, status: <antes>, valor_estimado, orcamento_id }  // se houver
}
```

Não muda nenhum comportamento atual da aprovação.

### 3. Página de admin: "Histórico de Ações"

Nova rota `/admin/historico-acoes` (proteção `requiredPermission="admin_permissions"`, mais checagem de role `admin` na própria página).

- Lista as ações da empresa atual, ordenadas por mais recente.
- Filtros simples: tipo, usuário, status (todas / pendentes / desfeitas), busca por descrição.
- Cada linha: data, usuário, descrição, badge "Desfeita" se aplicável.
- Botão **"Desfazer"** apenas para ações não-desfeitas:
  - Confirmação (`AlertDialog`).
  - Para `orcamento_aprovado`: faz `update` no orçamento restaurando os campos de `estado_anterior.orcamento` e `status='pendente'`; se houver OS vinculada, restaura `ordens_servico` para o status anterior (tipicamente `pendente`), limpa `orcamento_id` se era nulo, restaura `valor_estimado`.
  - Marca a ação como `desfeita=true, desfeita_em=now(), desfeita_por=auth.uid()`.
  - Registra atividade no sistema ("Admin X desfez aprovação do orçamento Y").
  - Toast + reload.

### 4. Acesso no menu

Adicionar item "Histórico de Ações" no `AppSidebar` visível apenas quando `userRole === 'admin'`.

### 5. Rota

Adicionar `<Route path="/admin/historico-acoes" .../>` em `AuthenticatedApp.tsx`.

### Extensão futura

A tabela é genérica (`tipo` + `estado_anterior` jsonb), então outros fluxos (rejeição, finalização, exclusão, mudança de status manual, etc.) podem ser registrados depois sem nova migração — basta adicionar um novo handler no switch de "desfazer".

Posso seguir com a implementação?