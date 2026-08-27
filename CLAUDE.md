# Anuncia

SaaS de lançamento de imóveis para corretores autônomos e pequenas imobiliárias brasileiras. Ver `PRODUCT_SPEC.md` (produto), `CLAUDE_CODE_PROMPT.md` (regras técnicas e modelo de dados), `BACKLOG.md` (sprints) e `LAUNCH_PLAN.md` (go-to-market) antes de implementar qualquer coisa.

## Stack decidida (Sprint 0)

- **Frontend** (`app/`): Vanilla JS + Vite → Vercel
- **Backend** (`server/`): Express.js → Railway
- **Dados**: Supabase (Postgres + Auth) — projeto `anuncia` (id `vwainyqdrlcywgkqedlw`, região sa-east-1), schema em `db/supabase_setup.sql`, já aplicado
- **IA**: Claude (Anthropic SDK) para geração do pacote de lançamento
- **Pagamento**: **Asaas** (decisão do Álvaro em 2026-08-26, não Stripe — mesmo gateway já usado em VYRON/IRYON). Implementação no Sprint 6, pausado de propósito até o redesign visual terminar. O backend deve manter a geração de conteúdo e o billing desacoplados desde o início.

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

**Sprint 0, 1, 2, 3, 4 e 5 (P0) concluídos** — ver `BACKLOG.md`. Sprint 5 P1 (PDF, copiar formatado por canal) não implementado — deliberadamente adiado, não é bloqueante do MVP.

Supabase configurado por completo: projeto `anuncia`, schema aplicado, bucket `anuncia-logos` criado, `server/.env` com a secret key real. GitHub: repo `severex05/anuncia` criado e com push (autenticação via token pessoal, não `gh` CLI). Vercel: bloqueado por permissão do GitHub App (ver histórico da sessão 2026-08-25 — precisa liberar "anuncia" em github.com/settings/installations). Railway: ainda não conectado (MCP requer OAuth interativo).

Sprint 1 testado de ponta a ponta com usuário real (signup → GET/PUT `/api/profile` → upload de logo → `DELETE /api/account`, incluindo confirmação de que o token para de funcionar depois da exclusão): tudo passou.

Sprint 2 (CRUD de imóvel) também testado de ponta a ponta: criar, validação de consistência (área privativa > total rejeitada, suítes > dormitórios rejeitada, título obrigatório), buscar/filtrar, editar, duplicar, excluir, e **isolamento de dados entre usuários confirmado com um terceiro usuário real** (outro usuário não vê nem consegue excluir imóvel alheio — 404, não 403, pra não vazar que o registro existe).

Sprint 3 (geração) implementado e testado de ponta a ponta com Claude real (`claude-haiku-4-5-20251001`, override via `ANTHROPIC_MODEL`): `POST /api/properties/:id/generate` (contrato JSON forçado via tool-use, validação server-side + 1 retry automático de correção, mock de IA quando `ANTHROPIC_API_KEY` não está configurada, idempotência por `idempotency_key` — testada com replay, corrida de duplo clique em paralelo e retry real após falha de provedor reaproveitando a mesma linha de pacote sem perder o rascunho), `GET /api/properties/:id/packages`, `GET /api/packages/:id`. Guardrails de compliance confirmados na prática: a IA sinaliza dado ausente (`missing_fact`) em vez de inventar. Contador de consumo (`anuncia_usage_events`, tipo `geracao`) confirmado 1:1 com gerações bem-sucedidas — nem replay nem corrida geram consumo duplicado. Migração aplicada: `anuncia_compliance_alerts` agora aceita alerta no nível do pacote (`package_id`), não só por ativo.

Sprint 4 (editor e revisão) implementado e testado de ponta a ponta **no navegador real** (Playwright, não só via curl): tela de geração (`app/src/packageEditor.js`) com seleção de tipos de ativo + instrução opcional, editor por ativo com abas pros 9 tipos, "Copiar" (clipboard), edição manual salvável (`PUT /api/assets/:id`), regeneração com instrução rápida usando IA real ("Deixe mais curto" testado ao vivo, ~5s), histórico de versões (`GET/POST /api/assets/:id/versions...`) com restaurar testado e confirmado (não duplica, snapshot correto), checklist antes de exportar (`PUT /api/packages/:id/checklist`) com persistência confirmada após reload de página, painel de alertas de revisão mostrando categoria/trecho/sugestão. Status do imóvel muda pra "Gerado" após a 1ª geração (confirmado no dashboard). Contador de consumo estendido pra cobrir `regeneracao`, não só `geracao`.

Sprint 5 (exportação e compartilhamento) implementado e testado de ponta a ponta, incluindo no navegador: `GET /api/packages/:id/export?format=md|txt` (download real testado via Playwright — Content-Disposition com nome de arquivo slugificado sem acentos), `POST/DELETE /api/packages/:id/share` (token de 192 bits via `crypto.randomBytes`, regenerar sempre cria token novo, revogar de fato apaga o token do banco) e `GET /api/public/packages/:token` — rota pública **sem** `requireAuth`, retorna objeto curado (nunca a linha crua da tabela, pra nunca vazar `user_id`/`palavras_proibidas`/etc.), testada com sucesso **sem nenhum header de autenticação** e também no navegador **sem sessão logada** (`app/src/shareView.js`, roteada em `main.js` por `window.location.pathname` antes de qualquer checagem de sessão — funciona porque o Vite dev server já faz fallback de SPA pra `index.html` em qualquer path).

**Bug real encontrado e corrigido no caminho**: nome do arquivo exportado sempre caía no fallback genérico (`anuncia.md`) porque o Express `cors()` não expõe `Content-Disposition` por padrão pro `fetch()` do frontend ler — corrigido com `exposedHeaders: ["Content-Disposition"]`.

**Redesign visual definitivo (2026-08-26)** — a identidade "provisória" do Sprint 0 foi substituída por um sistema editorial de verdade, a pedido do Álvaro ("algo diferente de qualquer um e que ajude muito nas conversões"). Fluxo: `/pinterest-research` (evitou o clichê de "SaaS roxo/dark genérico" que domina as referências de dashboard "premium") → `/design-sync` no Claude Design (projeto "Anuncia Design System", projectId `ba034bb9-255b-4887-9942-2ff1555a936b`) → implementado em `app/src/style.css` + todas as telas. Tokens evoluídos (mesmo marinho+dourado, mais confiantes): `--ink #0c1729` + `--gold #c9974a` (moderação cirúrgica, ~1 CTA por tela) + `--paper #f6f1e7` (nova superfície quente) + **Instrument Serif** itálico pra títulos/destaque + Inter pro corpo. O editor de conteúdo (`packageEditor.js`) virou tratamento de "manuscrito sendo revisado" (superfície papel, tipografia serifada de leitura, letra capitular) em vez de chat de IA. Testado de ponta a ponta no navegador real (Playwright): login → onboarding → dashboard → criar imóvel → gerar pacote (IA real) → editor — cada tela conferida visualmente contra o design system publicado, bateu 1:1.

**Ajustes finais pós-redesign (2026-08-26, mesma sessão):**
- Corrigido: `.btn-danger-link` (pensado pro link solitário "Excluir conta") tinha `display:block; margin:24px auto 0` que vazava pro card de imóvel, fazendo "Excluir" quebrar linha e flutuar desalinhado dos outros botões — escopado com `.property-card-actions .btn-danger-link`.
- Corrigido: sessão inválida/expirada no navegador (usuário deletado no backend mas token ainda em `localStorage`) agora faz logout automático (`supabase.auth.signOut()` + reload) em vez de mostrar erro cru — `authedFetch` em `app/src/api.js` detecta 401 e trata centralizadamente. Testado de verdade: deletei um usuário com sessão ativa no navegador e confirmei o redirecionamento limpo pro login.

**Pendências conhecidas, não bloqueantes:**
- Upload de logo não limpa o Storage quando a conta é excluída (cascade só cobre tabelas do Postgres, não objetos do bucket) — órfão pequeno, resolver quando o volume justificar.
- Regeneração de ativo único não persiste os `warnings` retornados como `compliance_alerts` no banco (só aparecem na resposta imediata da regeneração) — os `global_warnings` do pacote inteiro (geração completa) persistem normalmente.
- `PUT /api/profile` não aceita atualizar só `onboarding_completo` sozinho (precisa vir junto de outro campo de `PROFILE_FIELDS`, senão cai no guard de "nenhum campo válido" e retorna 400) — não afeta o fluxo real de onboarding (sempre envia o formulário inteiro junto), só pegou um teste manual isolado.
- Não existe tela pra editar o perfil depois do onboarding completo — dashboard não tem link "editar perfil" (só existe a rota inicial, condicionada a `onboarding_completo=false`). P1.

## Decisão de trial (2026-08-27)
**1 pacote completo grátis**, sem cartão, sem prazo — não trial por tempo. Corretor não avalia o produto sem ver um pacote de verdade gerado, e limitar por quantidade (não por dias) protege o custo de IA desde o primeiro usuário.

## Sprint 6 (Monetização) — P0 implementado e testado de ponta a ponta (2026-08-27)

Backend novo: `server/billing.js` (`PLAN_LIMITS`, `getOrCreateSubscription`, `checkGenerationQuota` — desacoplado de propósito do provedor: `anuncia_subscriptions` guarda `plano`/`status` em termos genéricos, o único campo específico de provedor é `provider_id`, reservado pro Asaas no P1). Limites: trial = 1 pacote (vitalício), Solo = 10/mês, Pro = 25/mês (calendário UTC, não ciclo de cobrança real ainda — isso só vem com o Asaas no P1).

`POST /api/properties/:id/generate` agora checa cota antes de gerar (não bloqueia replay nem retry após erro, só geração nova de verdade) — retorna 402 com `{error, quota: {plano, usado, limite, ciclo}}` quando estourado. `GET /api/subscription` expõe o mesmo dado pro frontend mostrar o uso.

Sem checkout real ainda (Asaas fica pro P1) — troca de plano manual via `PUT /api/admin/subscriptions/:userId` protegido por `ADMIN_KEY` (header `x-admin-key`, mesmo padrão do VYRON/IRYON), pra pilotos pagos ou testes até o checkout existir.

**Coleta de dados pro Asaas** (lembrete do Álvaro): cliente do Asaas exige CPF/CNPJ, e cobrança pode ir por WhatsApp — perfil profissional ganhou os campos `cpf_cnpj` e `contatos.telefone` (celular, separado do WhatsApp de conteúdo). E-mail não precisou de campo novo: já vem do Supabase Auth (`req.userEmail` no backend).

**Testado de ponta a ponta**, curl + navegador real (Playwright): usuário novo → perfil com CPF/celular salvos → 1ª geração funciona e consome o pacote grátis → `GET /api/subscription` mostra `1/1, permite_gerar:false` → 2ª geração bloqueada com 402 → endpoint admin sem chave dá 403, com chave dá 200 e muda pra Solo → geração volta a funcionar (`0/10` na visão do ciclo mensal, badge "Plano Solo — X/10 lançamentos este mês" aparece certinho no formulário de geração). Banco de teste limpo depois (cascade cobrindo `anuncia_subscriptions` também, confirmado).

Migrações aplicadas: `sprint6_remove_dead_plan_columns` (removeu `professional_profiles.plan`/`stripe_customer_id`, mortos desde o Sprint 0 e duplicando/confundindo com `anuncia_subscriptions` + decisão real de usar Asaas), `sprint6_cpf_cnpj_perfil`.

**Limitação conhecida, não bloqueante**: o contador mensal (Solo/Pro) conta por calendário UTC, não por ciclo de assinatura real — então um upgrade de trial pra Solo no mesmo mês carrega a geração do trial pro contador do Solo. Fica resolvido quando o Asaas popular `periodo_atual_inicio`/`fim` de verdade no P1.

**Ainda falta (P1, não é bloqueio do P0)**: checkout real + webhook do Asaas, portal do assinante, página de preços.

## Regra permanente: zero menção a "IA" no produto (2026-08-27)

Decisão explícita do Álvaro: nenhuma tela do app nem a landing pode citar "IA"/"inteligência artificial" em texto visível ao usuário — o produto se apresenta pelo mérito do trabalho (workflow, voz do corretor, revisão), não pela tecnologia por trás. Isso já era a filosofia do `LAUNCH_PLAN.md` original ("não apenas telas bonitas com a palavra IA"), agora é regra sem exceção. O aviso de "revise antes de publicar" continua existindo — só sem citar a tecnologia. Vale pra qualquer texto novo (UI, exports, e-mails, landing) daqui pra frente.

## Sprint 7 (Landing) — Landing page P0 implementada e testada (2026-08-27)

Varredura de "IA" no app inteiro (regra acima): só existiam 4 ocorrências reais visíveis ao usuário (`packageEditor.js` x2, `shareView.js`, e o rodapé do export em `server.js`) — todas reescritas mantendo o aviso de revisão, sem citar a tecnologia.

Pesquisa rápida (`/pinterest-research`, focada em estrutura de conversão, não paleta — já temos a definitiva) confirmou o padrão "antes/depois" (input → output com seta) pra demonstração, hero com resultado em vez de categoria, CTA repetido 3x (hero, meio, fim), pricing de 3 colunas simples. Aplicado direto no código (`app/src/landing.js`), sem rodada nova de Claude Design — reaproveita 100% os tokens/tipografia já publicados.

Nova landing (`/`) com: hero (headline + CTA + prova de confiança), problema (3 dores), demonstração antes/depois (imóvel fictício → Instagram/WhatsApp/Chamada, rotulado "exemplo ilustrativo"), 6 diferenciais, 3 planos (Teste grátis/Solo/Pro, Solo destacado "mais popular"), FAQ em acordeão (`<details>`, sem JS extra) e CTA final. Roteamento novo em `main.js`: usuário sem sessão em `/` vê a landing; `/entrar` e `/cadastro` (linkáveis, úteis pra campanha paga futura) pulam direto pro formulário de auth no modo certo; `auth.js` ganhou `setAuthMode()` exportado. `window.history.pushState` + listener de `popstate` pra voltar funcionar direito.

Testado no navegador real: clique nos 3 CTAs leva pra `/cadastro` no modo certo, `/entrar` direto funciona (bookmarkável), botão voltar do navegador retorna a landing, accordion do FAQ abre/fecha, cadastro+login completo via usuário de teste chegou até o onboarding normalmente (perfil com CPF/celular do Sprint 6 aparecendo certinho), responsivo mobile conferido (seta da demonstração gira pra vertical, grids empilham). Banco de teste limpo depois.

**Achado no caminho, não é bug do Anuncia**: o formulário público de cadastro do Supabase rejeita e-mails em domínios sem registro MX real (`@anuncia-test.com`, usado historicamente nos testes deste projeto) com `email_address_invalid` — só funciona via Admin API (que pula essa validação) ou um domínio de e-mail de verdade. Vale lembrar em sessões futuras: pra testar o formulário de cadastro *público* de qualquer projeto Supabase, usar um domínio com MX real (ex: mailinator.com), não um domínio fictício.

**Ainda falta do Sprint 7 (P0)**: página de exemplos dedicada, Termos de Uso + Política de Privacidade (LGPD), analytics de produto (eventos de cadastro/geração/exportação/assinatura).
