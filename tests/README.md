# Testes

Ainda não implementados (Sprint 0 é só esqueleto). Cobertura obrigatória, definida em `CLAUDE_CODE_PROMPT.md` > "Testes obrigatórios", a implementar junto com cada sprint correspondente:

- Isolamento de dados entre usuários (RLS + queries sempre por `user_id`)
- Validação dos campos do imóvel
- Bloqueio por limite de plano
- Resposta inválida do provedor de IA
- Retry sem duplicar pacote (idempotência)
- Conteúdo que tenta inventar fatos
- Conteúdo com alertas de linguagem sensível
- Edição e histórico de versões
- Exportação
- Fluxo de assinatura em ambiente de teste
