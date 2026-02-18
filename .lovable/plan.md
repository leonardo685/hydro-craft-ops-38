

# Correção: Fluxo de Recuperação de Senha

## Problema

O link de recuperação do Supabase redireciona para `https://fixzys.lovable.app` (raiz). Quando o app carrega, o `AuthProvider` processa os tokens do hash antes do `RecoveryRedirect` conseguir detectar e redirecionar para `/reset-password`. Resultado: o usuario cai na tela de login.

## Solucao

Adicionar deteccao do evento `PASSWORD_RECOVERY` diretamente no `AuthProvider`, que e onde o Supabase processa os tokens. Quando esse evento for detectado, redirecionar imediatamente para `/reset-password`.

## Alteracoes

### 1. `src/contexts/AuthContext.tsx`
No `onAuthStateChange` (linha 131-147), adicionar tratamento do evento `PASSWORD_RECOVERY`:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    // Se for recuperacao de senha, redirecionar imediatamente
    if (event === 'PASSWORD_RECOVERY') {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      navigate('/reset-password', { replace: true });
      return;
    }

    setSession(session);
    setUser(session?.user ?? null);
    // ... resto do codigo existente
  }
);
```

Isso garante que, independente de qual URL o Supabase redirecionou, o app detecta o evento de recuperacao e leva o usuario para a pagina correta.

### 2. Acao necessaria do usuario

Apos aprovar e publicar esta correcao:
- O usuario afetado deve solicitar um **novo email de recuperacao** (o link anterior ja expirou ou aponta para URL errada)
- As URLs no Supabase Dashboard devem estar configuradas:
  - **Site URL**: `https://fixzys.lovable.app`  
  - **Redirect URLs**: `https://fixzys.lovable.app/**`

