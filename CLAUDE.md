# Listing Launch OS

SaaS de lançamento de imóveis para corretores autônomos e pequenas imobiliárias brasileiras. Ver `PRODUCT_SPEC.md` (produto), `CLAUDE_CODE_PROMPT.md` (regras técnicas e modelo de dados), `BACKLOG.md` (sprints) e `LAUNCH_PLAN.md` (go-to-market) antes de implementar qualquer coisa.

## Stack decidida (Sprint 0)

- **Frontend** (`app/`): Vanilla JS + Vite → Vercel
- **Backend** (`server/`): Express.js → Railway
- **Dados**: Supabase (Postgres + Auth) — schema em `db/supabase_setup.sql`
- **IA**: Claude (Anthropic SDK) para geração do pacote de lançamento
- **Pagamento**: a decidir no Sprint 6 (Stripe é o padrão da empresa; Asaas é alternativa se PIX/boleto virar bloqueio real de conversão — não decidir sem necessidade). O backend deve manter a geração de conteúdo e o billing desacoplados desde o início.

Mesmo padrão de monorepo do AlphaSignal/IRYON: `app/` e `server/` com `package.json` próprios, deploy separado (Vercel root dir `app/`, Railway root dir `server/`).

## Regras de implementação

Todas as regras detalhadas (segurança, contrato JSON da IA, testes obrigatórios, o que não fazer) estão em `CLAUDE_CODE_PROMPT.md` — não duplicar aqui, ler antes de cada sprint.

Auth: Supabase Auth puro (padrão IRYON — `requireAuth` via `supabase.auth.getUser(token)`, sem JWT próprio). Ver `server/server.js`.

Tabelas prefixadas `llos_` no Supabase, para não colidir com outros projetos que compartilham o mesmo projeto Supabase se aplicável.

## Comandos

```bash
# Frontend
cd app && npm install && npm run dev

# Backend
cd server && npm install && npm run dev
```

## Estado atual

Sprint 0 em andamento — ver `BACKLOG.md`. Repositório ainda não tem conta Supabase/GitHub/Vercel/Railway configurada; isso é o próximo passo depois do esqueleto local.
