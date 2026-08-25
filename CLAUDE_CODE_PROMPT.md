# Prompt mestre para Claude Code

Você é o engenheiro principal responsável por construir o Anuncia, um SaaS brasileiro para corretores de imóveis autônomos e pequenas imobiliárias.

## Contexto do produto

O produto permite cadastrar os dados de um imóvel uma única vez e gerar um pacote completo de lançamento: descrição longa, descrição curta, legenda para Instagram, texto para Facebook, mensagem de WhatsApp, e-mail, roteiro de Reel, chamadas, hashtags moderadas e checklist de revisão.

O produto não deve ser tratado como um chatbot genérico. Ele é um workflow vertical de lançamento imobiliário. O usuário não deve precisar escrever prompts. Toda geração deve usar dados estruturados do imóvel, perfil de voz do corretor e regras de segurança.

## Usuário inicial

O usuário inicial é um corretor brasileiro independente, que trabalha principalmente com Instagram e WhatsApp. O segundo público é uma pequena imobiliária com 2 a 10 corretores.

Idioma inicial: português brasileiro. A arquitetura deve permitir inglês no futuro, mas não implementar internacionalização completa antes do MVP funcionar.

## Objetivo do MVP

Entregar uma primeira versão utilizável que permita:

1. Criar conta e completar perfil profissional.
2. Configurar nome, CRECI, cidade, contato, Instagram, tom de voz, logo e palavras proibidas.
3. Criar um imóvel com formulário estruturado.
4. Gerar um pacote de marketing usando o provedor de LLM configurado no servidor.
5. Exibir o conteúdo por ativo, com edição, regeneração, cópia e histórico.
6. Mostrar alertas de fatos não confirmados, exageros e linguagem potencialmente problemática.
7. Exportar o pacote em texto/Markdown e compartilhar uma página privada de leitura.
8. Criar limites de uso por plano e preparar billing para R$97 e R$147 mensais.
9. Possibilitar administração básica de usuário, consumo e status de assinatura.

## Regras de implementação

Antes de escrever código, inspecione o repositório existente, o README, a stack, as variáveis de ambiente e a estrutura de banco. Não substitua a arquitetura atual sem necessidade. Faça mudanças pequenas, verificáveis e reversíveis.

Não coloque chaves de API no frontend. Todas as chamadas de IA devem ser feitas no backend. Nunca registre prompts contendo dados sensíveis em logs de produção. Trate erros de timeout, limite de uso, resposta inválida e indisponibilidade do provedor sem perder o rascunho do usuário.

Use schemas estruturados para a resposta da IA. Não aceite uma resposta livre quando a aplicação espera JSON. Valide a resposta no servidor e implemente fallback amigável. A geração deve ser idempotente quando possível para evitar cobranças e consumo duplicado por cliques repetidos.

Não faça scraping de portais imobiliários. Não implemente integração com MLS, ZAP, Viva Real ou outros portais no MVP. Não implemente publicação automática em redes sociais sem avaliar APIs oficiais, permissões e termos de uso.

O conteúdo de IA é sempre um rascunho. A interface deve informar que o corretor precisa revisar fatos, preço, disponibilidade, imagens e regras profissionais antes de publicar. Não use textos como "garantia de compliance" ou "garantia de venda".

## Modelo de dados mínimo

Crie entidades equivalentes às seguintes, adaptando à ORM existente:

- User: identidade, e-mail, plano, status, createdAt.
- ProfessionalProfile: nome público, CRECI, estado, cidade, imobiliária, contatos, redes sociais, tom de voz, palavras preferidas, palavras proibidas, logo, cores.
- Property: título interno, tipo, finalidade, operação, preço, taxas, endereço, cidade, bairro, áreas, quartos, suítes, banheiros, vagas, andar, mobiliado, características, diferenciais, descrição do entorno, status, createdAt, updatedAt.
- PropertyMedia: referência de imagem/arquivo, ordem, tipo e autorização declarada.
- LaunchPackage: propertyId, versão, status, modelo usado, tokens/custo se disponível, createdAt.
- ContentAsset: packageId, tipo do ativo, conteúdo, status, versão, origem dos campos, createdAt, updatedAt.
- ComplianceAlert: assetId, categoria, severidade, trecho, explicação, sugestão, estado.
- UsageEvent: usuário, tipo de evento, quantidade, metadata mínima, createdAt.
- Subscription: usuário/workspace, plano, status, providerId, período atual.
- Workspace e Membership podem ser implementados quando o modo equipe começar; não tornar obrigatórios no MVP individual.

## Contrato de geração

A função do backend deve receber:

- perfil do profissional;
- dados estruturados do imóvel;
- tipos de ativos solicitados;
- regras de estilo;
- instrução opcional do usuário;
- idioma e região.

A resposta deve seguir um schema semelhante a:

```json
{
  "property_summary": "string",
  "assets": [
    {
      "type": "long_description|short_description|instagram|facebook|whatsapp|email|reel_script|headline|checklist",
      "title": "string",
      "content": "string",
      "source_fields": ["string"],
      "warnings": ["string"]
    }
  ],
  "global_warnings": [
    {
      "category": "missing_fact|unsupported_claim|sensitive_language|consistency|other",
      "severity": "low|medium|high",
      "message": "string",
      "suggestion": "string"
    }
  ]
}
```

O prompt interno deve instruir o modelo a nunca inventar dados, não inferir segurança, perfil de família, religião, raça, nacionalidade, idade ou condição financeira, não prometer valorização e não criar distância ou informação de bairro sem campo fornecido.

## UX esperada

A tela inicial deve explicar a proposta em uma frase e ter CTA "Criar meu primeiro lançamento". O fluxo principal deve ser linear: Perfil → Novo imóvel → Gerar pacote → Revisar → Exportar.

O usuário deve ver progresso, estados de carregamento, erro recuperável, consumo restante, custo/plano e aviso de revisão. Em telas pequenas, o conteúdo deve ser fácil de copiar para WhatsApp e Instagram. No desktop, a aplicação pode usar layout com lista de ativos à esquerda e editor à direita.

## Design

Use visual profissional, moderno e confiável, evitando estética excessivamente futurista de IA. A interface deve parecer uma ferramenta de trabalho para profissionais imobiliários. Use alto contraste, hierarquia clara, componentes reutilizáveis, estados vazios bem escritos e feedback explícito.

O design deve funcionar bem em mobile e desktop. PWA pode ser preparada depois do fluxo principal; não sacrificar confiabilidade para implementar instalação offline no primeiro sprint.

## Billing e limites

Prepare os planos:

- Trial ou primeiro pacote limitado.
- Solo: R$97/mês.
- Pro: R$147/mês.
- Team: reservado para uma fase posterior.

Não liberar funcionalidades premium apenas no frontend. O backend deve verificar plano e consumo. Se billing real ainda não estiver configurado, crie uma camada de abstração e um modo de desenvolvimento claramente separado do modo produção.

## Segurança e privacidade

Use autorização em todas as queries por userId/workspaceId. Evite IDs previsíveis em URLs públicas. Rate-limit endpoints de geração. Valide uploads, tamanho e tipo. Não exponha dados de um usuário para outro. Adicione exclusão de conta e exclusão de imóvel quando suportado pela stack.

Crie páginas ou placeholders para Termos de Uso e Política de Privacidade. Inclua aviso de que o conteúdo gerado é rascunho e precisa de revisão humana. Não afirmar conformidade jurídica.

## Testes obrigatórios

Escreva testes para:

- isolamento de dados entre usuários;
- validação dos campos do imóvel;
- bloqueio por limite de plano;
- resposta inválida do provedor de IA;
- retry sem duplicar pacote;
- conteúdo que tenta inventar fatos;
- conteúdo com alertas de linguagem sensível;
- edição e histórico de versões;
- exportação;
- fluxo de assinatura em ambiente de teste.

## Ordem de execução

1. Inspecionar o projeto e documentar a stack existente.
2. Criar ou validar o schema de dados.
3. Implementar autenticação e perfil profissional.
4. Implementar CRUD do imóvel.
5. Implementar geração mockada com schema estruturado.
6. Implementar integração real de IA no backend.
7. Implementar editor, histórico, alertas e exportação.
8. Implementar limites e camada de billing.
9. Implementar landing page, pricing, termos e política.
10. Criar testes, corrigir erros e executar verificação visual/responsiva.
11. Documentar variáveis de ambiente, comandos, seed e deploy.

## Critérios de conclusão do MVP

O MVP está pronto quando um novo usuário consegue criar conta, configurar seu perfil, cadastrar um imóvel, gerar o pacote, revisar/editar os ativos, copiar ou exportar o resultado e visualizar seu consumo sem erro. O fluxo deve funcionar em mobile e desktop, com dados isolados, chaves protegidas, respostas da IA validadas e mensagens de erro úteis.

Não avance para funcionalidades novas enquanto esse fluxo não estiver estável. Ao final de cada etapa, mostre arquivos alterados, testes executados, riscos restantes e próxima etapa recomendada.
