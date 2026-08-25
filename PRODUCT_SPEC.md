# Listing Launch OS

## Documento de especificação do produto

**Versão:** 1.0
**Mercado inicial:** Brasil
**Idioma inicial:** Português brasileiro
**Público principal:** corretores de imóveis autônomos e pequenas imobiliárias
**Objetivo do projeto:** criar receita recorrente suficiente para financiar a meta pessoal do fundador, sem depender de um produto genérico de geração de texto.

## 1. Visão do produto

O Listing Launch OS é um SaaS que permite ao corretor cadastrar os dados de um imóvel uma única vez e gerar um pacote completo de lançamento comercial, revisável e pronto para publicação.

O produto não será apresentado como um "gerador de textos com IA". A categoria comercial será **sistema de lançamento de imóveis**. O benefício central é reduzir o tempo entre receber as informações do imóvel e publicar uma comunicação consistente em Instagram, WhatsApp, portais, e-mail e outros canais.

### Frase de posicionamento

> Cadastre o imóvel uma vez. Gere todo o material de divulgação. Revise e publique em minutos.

### Problema que resolvemos

O corretor normalmente repete os mesmos dados em diversos lugares, adapta textos manualmente, esquece algum canal, publica conteúdos inconsistentes e perde tempo com tarefas que não aumentam diretamente suas vendas. Ferramentas genéricas de IA produzem texto, mas não conhecem o fluxo de lançamento, não preservam a voz do corretor, não organizam as versões e não ajudam a revisar riscos de comunicação imobiliária.

### Resultado desejado pelo usuário

Ao finalizar um lançamento, o corretor deve ter uma descrição principal, uma versão curta, posts para redes sociais, texto para WhatsApp, roteiro de vídeo curto, e-mail, chamada para anúncio, checklist e biblioteca do imóvel. Ele deve conseguir editar, aprovar, copiar, baixar ou compartilhar tudo sem montar prompts.

## 2. Público-alvo inicial

O cliente inicial é o corretor autônomo brasileiro que trabalha principalmente com Instagram e WhatsApp, possui poucos recursos operacionais, recebe novos imóveis de forma recorrente e precisa parecer profissional sem contratar uma agência.

O segundo segmento é a pequena imobiliária de 2 a 10 corretores que quer padronizar a comunicação, mas não precisa ainda de um CRM completo. O produto deve atender esse segmento depois que o fluxo individual estiver comprovado.

Não começar por grandes imobiliárias, construtoras, incorporadoras, franquias, integrações profundas com portais ou clientes que exigem customização enterprise. Esses públicos podem ser uma expansão, mas atrapalham a velocidade do MVP.

## 3. Princípios do produto

O produto deve ser simples o suficiente para o corretor usar no celular, mas confortável no desktop. O usuário não deve precisar saber escrever prompts. Toda geração deve usar dados estruturados e instruções internas versionadas.

A IA deve tratar fatos fornecidos pelo usuário como fonte principal. Ela não deve inventar metragem, distância, vista, reformas, vagas, escolas, segurança, valorização ou características do bairro. Todo conteúdo gerado deve ser editável e aprovado pelo usuário antes de ser copiado ou exportado.

O produto deve vender economia de tempo e qualidade operacional, não prometer vendas, leads ou conversão garantida. Toda comunicação comercial deve evitar afirmações sem evidência.

## 4. MVP obrigatório

### 4.1 Conta e onboarding

O usuário cria uma conta com e-mail e senha ou autenticação social disponível na stack escolhida. No onboarding, informa nome, CRECI, cidade/estado, imobiliária, telefone, WhatsApp, e-mail, Instagram, tom de voz, palavras preferidas, palavras proibidas, logo e cores. O CRECI deve ser tratado como campo informativo; a aplicação não deve alegar que validou a licença sem integração oficial.

O onboarding deve permitir pular etapas e completar o perfil depois. O primeiro valor deve ser alcançado rapidamente: cadastro de conta, formulário de imóvel e geração do primeiro pacote.

### 4.2 Cadastro de imóvel

Campos mínimos: título interno, tipo do imóvel, finalidade, operação, preço, condomínio, IPTU quando aplicável, cidade, bairro, endereço público opcional, área total, área privativa, dormitórios, suítes, banheiros, vagas, andar, mobiliado ou não, características, diferenciais, estado de conservação, descrição do entorno, regras do imóvel, link de fotos e observações.

Os campos devem ser divididos por etapas: informações básicas, ambientes, localização, diferenciais, mídia, identidade e revisão. O usuário deve poder salvar como rascunho e duplicar um imóvel existente.

### 4.3 Geração do pacote

O primeiro pacote deve conter:

| Ativo | Objetivo |
|---|---|
| Descrição completa | Portal, site ou apresentação. |
| Descrição curta | Card, anúncio curto ou resumo. |
| Legenda Instagram | Publicação com CTA e contato. |
| Variação para Facebook | Texto mais explicativo e compartilhável. |
| WhatsApp | Mensagem curta para lista ou lead. |
| E-mail | Mensagem para compradores ou base. |
| Roteiro de Reel | Vídeo de 20–45 segundos. |
| Título e chamadas | Opções para teste e reutilização. |
| Checklist | Itens que o corretor deve revisar antes de publicar. |
| Sugestões de hashtags | Somente se úteis e sem spam. |

Cada ativo deve ter botão de regenerar, editar, copiar, favoritar e baixar. A regeneração deve permitir instruções rápidas como "mais curto", "mais sofisticado", "mais direto", "sem emojis", "foco em família" e "foco em investimento", sem permitir que o sistema faça alegações não presentes nos dados.

### 4.4 Revisão de qualidade e conformidade

O produto deve apresentar alertas, não garantias jurídicas. As categorias de alerta incluem fato ausente, possível exagero, afirmação não comprovada, linguagem que sugere preferência ou exclusão, informação sensível, promessa de valorização, referência a segurança, referência a escolas, erro de consistência entre campos e uso excessivo de superlativos.

Cada alerta deve explicar o motivo e oferecer uma sugestão de reescrita. O usuário pode aceitar, ignorar ou editar. O sistema deve registrar que a revisão foi exibida, sem declarar que o conteúdo está legalmente aprovado.

### 4.5 Biblioteca e histórico

O usuário deve ver todos os imóveis em estados como rascunho, gerado, revisando, aprovado e arquivado. Deve poder pesquisar por nome, bairro, tipo e status. O histórico de versões deve permitir restaurar uma versão anterior.

### 4.6 Exportação

O MVP deve oferecer copiar individualmente, copiar pacote completo, baixar Markdown ou TXT e compartilhar uma página privada somente leitura. PDF pode ser incluído se a geração for confiável, mas não deve bloquear o lançamento.

## 5. Funcionalidades de diferenciação

### Voz do corretor

O usuário fornece de três a cinco exemplos de textos próprios. O sistema extrai preferências de estilo e usa esse perfil nas gerações. O usuário também pode definir palavras proibidas e regras como "não usar emojis", "não escrever em tom agressivo" ou "sempre terminar com meu WhatsApp".

### Ficha de fatos verificáveis

O sistema separa fatos objetivos de instruções criativas. Todo output deve ser derivado da ficha do imóvel. O usuário consegue clicar em um trecho e ver quais campos originaram aquela afirmação.

### Pacote por canal

O conteúdo não deve ser apenas repetido. Cada canal recebe tamanho, estrutura e CTA apropriados. O produto deve evitar gerar oito versões idênticas.

### Checklist de lançamento

O checklist deve lembrar o usuário de verificar fotos, preço, condomínio, IPTU, disponibilidade, endereço, autorização de uso das imagens, contatos e informações obrigatórias da imobiliária. O checklist pode ser configurável por estado ou por equipe no futuro.

### Modo equipe

A expansão para equipes deve incluir workspace, usuários, papéis, aprovação, templates compartilhados, identidade visual, histórico e consumo por membro. Não implementar permissões complexas no MVP individual.

## 6. Funcionalidades futuras

Depois da validação do MVP, priorizar calendário de conteúdo, integração de WhatsApp via provedor oficial, geração de imagens sociais com templates, importação autorizada de planilhas, links de captação, página pública do imóvel, biblioteca de bairros, métricas de uso, cobrança anual, programa de indicação, modo agência e API.

Funcionalidades de alto potencial incluem um "Listing Copilot" que sugere quais ativos ainda faltam, um comparador de versões, geração automática de atualização para o proprietário, assistente para responder dúvidas de leads com base apenas nos fatos do imóvel e um gerador de relatório de divulgação.

Não priorizar no início: CRM completo, scraping de portais, publicação automática em todos os portais, geração fotorrealista de imóveis, avaliação automática de preço, promessa de leads, discador de voz, aplicativo nativo e integrações que dependam de contratos não disponíveis.

## 7. Modelo comercial

### Planos de lançamento

| Plano | Preço inicial | Público | Limite sugerido |
|---|---:|---|---|
| Teste por imóvel | R$29–49 | Primeira experiência | Um pacote completo, entregue ou gerado no produto. |
| Solo | R$97/mês | Corretor independente | Até 10 lançamentos/mês. |
| Pro | R$147/mês | Corretor com mais volume | Até 25 lançamentos/mês, voz e biblioteca ampliadas. |
| Equipe | R$297–497/mês | Pequena imobiliária | Usuários, aprovação, templates e marca da equipe. |

O plano anual pode ser introduzido depois da validação, com desconto moderado. Não oferecer gerações ilimitadas no primeiro momento. Limites protegem margem, evitam abuso e ajudam a observar o padrão de uso.

### Garantia

Uma garantia de sete ou quatorze dias pode ser usada, desde que o produto deixe claro o que será reembolsado. Não prometer número de leads, vendas ou retorno financeiro. A promessa deve ser operacional: produzir e organizar o material de lançamento.

## 8. Concorrência e como competir

A Lano já oferece no Brasil CRM, sites, gestão de leads, WhatsApp, posts com IA, integrações e recursos de redecoração, com plano profissional divulgado a R$147/mês [1]. No mercado internacional, ListingAI oferece desde descrição e social até vídeos, staging, CMA e websites, com planos divulgados de US$19, US$36 e US$150 [2]. RealEstateContent.ai posiciona-se como plataforma de conteúdo social para agentes e divulga US$119/mês ou US$999/ano [3].

A estratégia não é competir em quantidade de features. A defesa é escolher um workflow estreito e executar melhor: menos campos, primeiro resultado rápido, output em português brasileiro, WhatsApp, voz do corretor, revisão de fatos e pacote de lançamento. Uma solução menor pode vencer uma suíte maior quando resolve a tarefa de forma mais rápida.

## 9. Segurança, privacidade e responsabilidade

O sistema deve coletar o mínimo necessário, oferecer exclusão de conta, proteger dados por usuário e workspace, não expor imóveis privados por URLs previsíveis e registrar alterações importantes. A chave de IA nunca pode aparecer no frontend. Segredos devem ficar em variáveis de ambiente.

O produto deve ter Termos de Uso e Política de Privacidade revisados por profissional antes do lançamento público. A aplicação deve dizer que o conteúdo é sugestão gerada por IA, que o usuário precisa revisar fatos e que a ferramenta não presta consultoria jurídica ou imobiliária.

A integração com qualquer portal deve ser autorizada e respeitar seus termos. Não realizar scraping de portais no MVP. Imagens e textos enviados pelo usuário devem ter instruções de uso e retenção claras.

## 10. Métricas

As métricas principais são tempo até o primeiro pacote, taxa de conclusão do onboarding, percentual que gera o primeiro imóvel, percentual que usa novamente em 30 dias, ativos copiados/exportados, conversão de teste para pagamento, receita recorrente, churn, tickets de suporte e custo por cliente adquirido.

O indicador de sucesso mais importante é **segundo uso**. Cadastros e gerações iniciais podem ser curiosidade. Um cliente que cria dois ou três pacotes e continua pagando demonstra valor real.

## 11. Critérios de lançamento

O produto pode sair do MVP quando conseguir criar um pacote coerente em menos de dois minutos após o preenchimento, salvar histórico corretamente, separar usuários, processar falhas de IA sem perder dados, cobrar pelo menos um plano, permitir edição e exportação, bloquear exposição de chaves e mostrar aviso de revisão humana.

Antes de tráfego pago amplo, obter de cinco a dez corretores pilotos, pelo menos três usos repetidos e depoimentos autorizados. O primeiro objetivo não é escalar anúncios; é provar que o fluxo é usado e pago.

## 12. Referências competitivas

[1]: https://lano.com.br/planos/ "Lano — Planos e preços"
[2]: https://www.listingai.co/pricing "ListingAI — Pricing Plans"
[3]: https://www.realestatecontent.ai/pricing-table/ "RealEstateContent.ai — Pricing"
