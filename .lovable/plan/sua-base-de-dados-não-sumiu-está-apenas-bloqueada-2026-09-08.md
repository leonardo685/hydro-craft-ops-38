# Sua base de dados NÃO sumiu — está apenas bloqueada

Acabei de consultar o banco diretamente e todos os dados estão lá, intactos:

| Tabela | Registros |
|---|---|
| Ordens de serviço | 263 (última em 02/09/2026) |
| Recebimentos | 249 |
| Orçamentos | 339 |
| Lançamentos financeiros | 2.269 |
| Clientes | 53 |
| Empresas | 2 |

O que aconteceu: o projeto Supabase passou do limite de armazenamento do plano gratuito (~13,4 GB, sendo 9,5 GB de vídeos de teste e 3,9 GB de fotos de equipamentos). Quando isso acontece, o Supabase **suspende o serviço** — o app não consegue nem fazer login — mas **não apaga nada**. Assim que o projeto voltar a ficar dentro do limite (ou o plano for atualizado), tudo volta a funcionar como antes.

O problema atual é apenas **encontrar a conta Supabase certa** para fazer o upgrade.

## Plano

### Passo 1 — Recuperar o acesso à conta Supabase

O primeiro usuário cadastrado no app foi **leonardo@mechidro.com.br** (17/10/2025). É muito provável que o projeto Supabase tenha sido criado com esse e-mail.

1. Sair da conta atual no Supabase (supabase.com/dashboard → ícone do perfil → Sign out).
2. Em "Sign in", clicar em **"Forgot your password?"** e digitar `leonardo@mechidro.com.br`.
   - Se chegar um e-mail de redefinição, a conta existe: definir senha e entrar.
   - Se o Supabase disser que não há conta com esse e-mail, repetir com os outros e-mails da empresa (`producao@`, `fiscal@`, e o seu Gmail pessoal).
3. Também vale tentar **"Continue with GitHub"** usando a mesma conta GitHub onde está o código do projeto — muitas vezes o Supabase foi vinculado por ali.
4. Ao entrar, abrir o link direto: `https://supabase.com/dashboard/project/fmbfkufkxvyncadunlhh`.
5. Se ainda aparecer "Create an organization", mandar e-mail para **support@supabase.com** informando o project ref `fmbfkufkxvyncadunlhh` e a organização `mgnnkokpmffzuoppuvbq`, pedindo para identificar o e-mail dono do projeto. Eles respondem com o e-mail mascarado.

### Passo 2 — Restaurar o serviço (ao entrar na conta)

Duas opções, você escolhe:

- **Opção A — Upgrade para o plano Pro (US$ 25/mês)**: em Settings → Billing → Change plan. Inclui 100 GB de armazenamento; o serviço volta em minutos e nada precisa ser apagado.
- **Opção B — Liberar espaço sem pagar**: apagar vídeos de teste antigos (ex.: com mais de 90 dias) até ficar abaixo de 1 GB. Isso exige apagar ~12,5 GB, ou seja, praticamente todos os vídeos e a maioria das fotos — perda permanente de anexos das ordens. Só recomendo se o custo do Pro for inviável.

### Passo 3 — Evitar que aconteça de novo (eu implemento depois)

- Política de retenção automática: vídeos de teste apagados após X dias (a definir com você) via função agendada.
- Compressão de fotos no upload (reduzir de ~1,6 MB para ~300 KB por foto).
- Alerta no painel admin mostrando o uso atual de armazenamento.

## Detalhes técnicos

- Conferência feita via consulta SQL direta ao projeto `fmbfkufkxvyncadunlhh` (contagens acima).
- Restrição ativa: `exceed_storage_size_quota` — bloqueia API/Auth/Storage, não remove dados.
- O Passo 3 usa `pg_cron` + Edge Function para limpeza do bucket `videos-teste` e `browser-image-compression` no frontend para fotos.
