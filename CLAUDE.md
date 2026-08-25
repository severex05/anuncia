# Anuncia

SaaS de lançamento de imóveis para corretores autônomos e pequenas imobiliárias brasileiras. Ver `PRODUCT_SPEC.md` (produto), `CLAUDE_CODE_PROMPT.md` (regras técnicas e modelo de dados), `BACKLOG.md` (sprints) e `LAUNCH_PLAN.md` (go-to-market) antes de implementar qualquer coisa.

## Stack decidida (Sprint 0)

- **Frontend** (`app/`): Vanilla JS + Vite → Vercel
- **Backend** (`server/`): Express.js → Railway
- **Dados**: Supabase (Postgres + Auth) — projeto `anuncia` (id `vwainyqdrlcywgkqedlw`, região sa-east-1), schema em `db/supabase_setup.sql`, já aplicado
- **IA**: Claude (Anthropic SDK) para geração do pacote de lançamento
- **Pagamento**: a decidir no Sprint 6 (Stripe é o padrão da empresa; Asaas é alternativa se PIX/boleto virar bloqueio real de conversão — não decidir sem necessidade). O backend deve manter a geração de conteúdo e o billing desacoplados desde o início.

Mesmo padrão de monorepo do AlphaSignal/IRYON: `app/` e `server/` com `package.json` próprios, deploy separado (Vercel root dir `app/`, Railway root dir `server/`).

## Regras de implementação

Todas as regras detalhadas (segurança, contrato JSON da IA, testes obrigatórios, o que não fazer) estão em `CLAUDE_CODE_PROMPT.md` — não duplicar aqui, ler antes de cada sprint.

Auth: Supabase Auth puro (padrão IRYON — `requireAuth` via `supabase.auth.getUser(token)`, sem JWT próprio). Ver `server/server.js`.

Tabelas prefixadas `anuncia_` no Supabase, para não colidir com outros projetos que compartilham o mesmo projeto Supabase se aplicável.

## Comandos

```bash
# Frontend
cd app && npm install && npm run dev

# Backend
cd server && npm install && npm run dev
```

## Estado atual

**Sprint 0 e Sprint 1 concluídos** — ver `BACKLOG.md`.

Supabase configurado por completo: projeto `anuncia`, schema aplicado, bucket `anuncia-logos` criado, `server/.env` com a secret key real. GitHub: repo `severex05/anuncia` criado e com push (autenticação via token pessoal, não `gh` CLI). Vercel: bloqueado por permissão do GitHub App (ver histórico da sessão 2026-08-25 — precisa liberar "anuncia" em github.com/settings/installations). Railway: ainda não conectado (MCP requer OAuth interativo).

Sprint 1 testado de ponta a ponta com usuário real (signup → GET/PUT `/api/profile` → upload de logo → `DELETE /api/account`, incluindo confirmação de que o token para de funcionar depois da exclusão): tudo passou.

**Pendências conhecidas, não bloqueantes:**
- Upload de logo não limpa o Storage quando a conta é excluída (cascade só cobre tabelas do Postgres, não objetos do bucket) — órfão pequeno, resolver quando o volume justificar.
