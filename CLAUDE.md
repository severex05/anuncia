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

**Sprint 0, 1, 2 e 3 concluídos** — ver `BACKLOG.md`.

Supabase configurado por completo: projeto `anuncia`, schema aplicado, bucket `anuncia-logos` criado, `server/.env` com a secret key real. GitHub: repo `severex05/anuncia` criado e com push (autenticação via token pessoal, não `gh` CLI). Vercel: bloqueado por permissão do GitHub App (ver histórico da sessão 2026-08-25 — precisa liberar "anuncia" em github.com/settings/installations). Railway: ainda não conectado (MCP requer OAuth interativo).

Sprint 1 testado de ponta a ponta com usuário real (signup → GET/PUT `/api/profile` → upload de logo → `DELETE /api/account`, incluindo confirmação de que o token para de funcionar depois da exclusão): tudo passou.

Sprint 2 (CRUD de imóvel) também testado de ponta a ponta: criar, validação de consistência (área privativa > total rejeitada, suítes > dormitórios rejeitada, título obrigatório), buscar/filtrar, editar, duplicar, excluir, e **isolamento de dados entre usuários confirmado com um terceiro usuário real** (outro usuário não vê nem consegue excluir imóvel alheio — 404, não 403, pra não vazar que o registro existe).

Sprint 3 (geração) implementado e testado de ponta a ponta com Claude real (`claude-haiku-4-5-20251001`, override via `ANTHROPIC_MODEL`): `POST /api/properties/:id/generate` (contrato JSON forçado via tool-use, validação server-side + 1 retry automático de correção, mock de IA quando `ANTHROPIC_API_KEY` não está configurada, idempotência por `idempotency_key` — testada com replay, corrida de duplo clique em paralelo e retry real após falha de provedor reaproveitando a mesma linha de pacote sem perder o rascunho), `GET /api/properties/:id/packages`, `GET /api/packages/:id`. Guardrails de compliance confirmados na prática: a IA sinaliza dado ausente (`missing_fact`) em vez de inventar. Contador de consumo (`anuncia_usage_events`, tipo `geracao`) confirmado 1:1 com gerações bem-sucedidas — nem replay nem corrida geram consumo duplicado. Migração aplicada: `anuncia_compliance_alerts` agora aceita alerta no nível do pacote (`package_id`), não só por ativo.

**Pendências conhecidas, não bloqueantes:**
- Upload de logo não limpa o Storage quando a conta é excluída (cascade só cobre tabelas do Postgres, não objetos do bucket) — órfão pequeno, resolver quando o volume justificar.
