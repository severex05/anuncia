# Anuncia — Pacote para iniciar no Claude Code

Este diretório contém a especificação do produto e os materiais necessários para começar o desenvolvimento do SaaS brasileiro de lançamento de imóveis.

## Ordem recomendada de uso

Primeiro, leia `PRODUCT_SPEC.md` para entender o produto, o público, o MVP, as regras de negócio, a concorrência e as funcionalidades futuras.

Depois, abra `CLAUDE_CODE_PROMPT.md` no Claude Code. Cole o conteúdo como prompt inicial ou salve-o no repositório como `CLAUDE.md`, adaptando os comandos à stack que você escolher. O Claude Code deve inspecionar o projeto existente antes de implementar.

Use `BACKLOG.md` para executar o desenvolvimento em sprints. Comece pelo Sprint 0 e não avance para recursos P1 antes de completar o fluxo de primeiro valor.

Use `LAUNCH_PLAN.md` para validar a oferta, entrevistar corretores, vender pilotos, definir criativos e planejar as novidades.

## Estrutura sugerida do repositório do produto

```text
anuncia/
├── README.md
├── PRODUCT_SPEC.md
├── CLAUDE_CODE_PROMPT.md
├── BACKLOG.md
├── LAUNCH_PLAN.md
├── app/
├── server/
├── db/
├── shared/
├── tests/
└── docs/
```

## Primeira instrução para o Claude Code

Depois de colar o prompt mestre, peça ao Claude Code:

> Leia os documentos do projeto, inspecione a stack atual e produza um plano de implementação dividido em tarefas pequenas. Não escreva a aplicação inteira de uma vez. Comece identificando o que já existe, o que falta, os riscos e as variáveis de ambiente necessárias. Em seguida, implemente apenas o Sprint 0 e mostre os testes executados.

## Decisão de escopo

O produto começa no Brasil, em português brasileiro, para corretores autônomos e pequenas imobiliárias. O MVP não inclui CRM completo, scraping de portais, publicação automática em redes, marketplace, aplicativo nativo ou promessa de leads. Essas funcionalidades só entram depois da validação do fluxo de lançamento e do segundo uso.
