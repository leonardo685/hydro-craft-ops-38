
# Plano: Correção do Acesso Público via QR Code

## Problema Identificado

Alguns celulares mostram a tela de login ao escanear o QR Code, enquanto outros abrem o laudo público corretamente.

### Causa Raiz

O QR Code aponta para `/ordem/MH-XXX-YY`, que é uma rota pública, mas todas as rotas estão dentro do `AuthProvider`. Quando um dispositivo tem um refresh token inválido/expirado no armazenamento local, o cliente Supabase tenta fazer refresh automático e falha. Isso pode causar comportamento inconsistente.

O log de rede confirma: `"Invalid Refresh Token: Refresh Token Not Found"` com status 400.

---

## Solução Proposta

Reorganizar a estrutura de rotas para que rotas públicas fiquem **fora** dos providers de autenticação.

### Alterações no `src/App.tsx`

```text
ANTES (estrutura atual):
├── AuthProvider
│   └── EmpresaProvider
│       └── Routes
│           ├── /auth
│           ├── /ordem/:numeroOrdem (público)
│           ├── /acesso-ordem/:numeroOrdem (público)
│           ├── /laudo-publico/:numeroOrdem (público)
│           └── ... rotas protegidas

DEPOIS (estrutura corrigida):
├── Routes
│   ├── /ordem/:numeroOrdem (público, SEM AuthProvider)
│   ├── /acesso-ordem/:numeroOrdem (público, SEM AuthProvider)
│   ├── /laudo-publico/:numeroOrdem (público, SEM AuthProvider)
│   ├── /convite/:token (público)
│   ├── /reset-password (público)
│   └── /* (todas as outras rotas)
│       └── AuthProvider
│           └── EmpresaProvider
│               └── Routes internas
```

---

## Implementação Técnica

### 1. Criar componente wrapper para rotas autenticadas

Criar `src/components/AuthenticatedApp.tsx` que contém:
- AuthProvider
- EmpresaProvider
- Rotas que exigem contexto de autenticação

### 2. Modificar `src/App.tsx`

- Mover rotas públicas para FORA dos providers
- Rotas públicas: `/ordem`, `/acesso-ordem`, `/laudo-publico`, `/convite`, `/reset-password`
- Criar uma rota catch-all que usa o `AuthenticatedApp`

### 3. Ajustar `LaudoPublico.tsx`

O componente usa `useLanguage()` que funciona porque `LanguageProvider` está no nível mais alto. Isso continuará funcionando.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Reorganizar estrutura de rotas |
| `src/components/AuthenticatedApp.tsx` | Novo - wrapper para rotas autenticadas |

---

## Benefícios

1. **Rotas públicas 100% isoladas** - não sofrem influência do estado de autenticação
2. **Consistência entre dispositivos** - mesmo comportamento independente do histórico de sessão
3. **Melhor performance** - rotas públicas não carregam lógica de autenticação desnecessária
4. **Elimina erros de refresh token** - páginas públicas não tentam refresh

---

## Nota sobre o QR Code

O QR Code está gerando a URL correta: `{origin}/ordem/{numeroOrdem}`

Após esta correção, o fluxo será:
1. Usuário escaneia QR Code → `/ordem/MH-001-26`
2. Página carrega **sem** verificar autenticação
3. Verifica se ordem está finalizada
4. Redireciona para `/acesso-ordem/MH-001-26` (pede telefone)
5. Após validação → `/laudo-publico/MH-001-26`

Todos esses passos ocorrerão sem interferência do estado de login do usuário.
