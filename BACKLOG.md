# Anuncia — Backlog priorizado

## Legenda

**P0** é obrigatório para lançar o MVP. **P1** aumenta ativação, retenção ou capacidade de cobrança. **P2** é expansão depois de validação. A regra é não iniciar P1 enquanto o fluxo P0 não estiver estável.

## Sprint 0 — Preparação

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Inspecionar stack e README | A documentação da stack, comandos e limitações está registrada. |
| P0 | Configurar ambientes | Desenvolvimento, teste e produção possuem variáveis separadas. |
| P0 | Definir identidade visual | Logo provisório, paleta, tipografia e componentes principais definidos. |
| P0 | Criar seed/demo | O projeto possui um perfil de corretor e imóvel de exemplo. |

## Sprint 1 — Conta e perfil profissional

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Cadastro/login | Usuário consegue criar conta e entrar. |
| P0 | Perfil profissional | Nome, CRECI, cidade, contatos, redes e tom de voz são salvos. |
| P0 | Upload de logo | Arquivo validado, limitado e vinculado ao perfil. |
| P0 | Palavras e regras de estilo | Preferências são editáveis e usadas nas gerações. |
| P0 | Exclusão de conta | Usuário consegue solicitar ou executar exclusão conforme a stack. |

## Sprint 2 — Imóvel

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | CRUD de imóvel | Criar, visualizar, editar, duplicar, arquivar e excluir. |
| P0 | Formulário em etapas | Campos organizados, validações e salvamento de rascunho. |
| P0 | Fatos e diferenciais | Campos objetivos separados de observações criativas. |
| P0 | Busca e filtros | Pesquisar por título, cidade, bairro e status. |
| P0 | Validação de consistência | Preço, área, quartos e campos obrigatórios sem conflito. |

## Sprint 3 — Geração

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Contrato JSON | Schema validado no servidor. |
| P0 | Mock de IA | O fluxo funciona sem chave real para desenvolvimento. |
| P0 | Integração de IA | Provedor acessado somente no backend. |
| P0 | Pacote de ativos | Pelo menos nove tipos de ativo gerados. |
| P0 | Retry e timeout | Falhas podem ser repetidas sem perder o rascunho. |
| P0 | Idempotência | Duplo clique não gera consumo duplicado. |
| P0 | Contador de consumo | Cada geração e regeneração é contabilizada. |

## Sprint 4 — Editor e revisão

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Editor por ativo | Conteúdo editável e salvável. |
| P0 | Copiar conteúdo | Funciona em desktop e mobile. |
| P0 | Regenerar com instrução rápida | "Mais curto", "mais direto" e "sem emojis" funcionam. |
| P0 | Histórico | Versões anteriores podem ser consultadas/restauradas. |
| P0 | Alertas de revisão | Alertas exibem trecho, motivo e sugestão. |
| P0 | Checklist | Usuário marca itens antes de exportar. |

## Sprint 5 — Exportação e compartilhamento

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Exportar Markdown/TXT | Pacote completo baixa corretamente. |
| P0 | Compartilhar página privada | Link usa token não previsível e pode ser revogado. |
| P1 | Exportar PDF | Layout legível e consistente. |
| P1 | Copiar por canal | Formatação adequada para WhatsApp e redes. |

## Sprint 6 — Monetização

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Plano de teste | Limite de uso aplicado no backend. |
| P0 | Plano Solo R$97 | Status e acesso associados ao usuário. |
| P0 | Plano Pro R$147 | Recursos e limites diferentes funcionando. |
| P0 | Abstração de billing | Provider pode ser trocado sem refazer domínio. |
| P1 | Checkout real | Pagamento de teste e webhook processados. |
| P1 | Portal do assinante | Cancelar, consultar plano e status. |
| P1 | Página de preços | Comparação simples, honesta e responsiva. |

## Sprint 7 — Landing e lançamento

| Prioridade | Item | Critério de aceite |
|---|---|---|
| P0 | Landing page | Problema, demonstração, planos, FAQ e CTA. |
| P0 | Página de exemplos | Exemplos fictícios claramente marcados como demonstração. |
| P0 | Termos e privacidade | Páginas publicadas e revisadas. |
| P0 | Analytics de produto | Eventos de cadastro, primeiro imóvel, geração, exportação e assinatura. |
| P1 | Programa de indicação | Link/código de indicação e crédito controlado. |
| P1 | Formulário de feedback | Coleta de problemas e pedidos. |

## P1 — Retenção e vantagem competitiva

- Calendário mensal de conteúdo baseado no perfil do corretor.
- Atualização automática de conteúdo quando preço ou disponibilidade mudar.
- Relatório para o proprietário com materiais produzidos e checklist.
- Voz do corretor melhorada com exemplos aprovados.
- Biblioteca de templates por cidade, tipo de imóvel e objetivo.
- Modo equipe com aprovação e identidade visual.
- Integração oficial com WhatsApp, quando houver provedor e caso de uso comprovado.
- Página pública do imóvel com captação de contato.
- Métricas de ativos copiados e exportados.

## P2 — Expansão

- Suporte a inglês e mercado americano.
- API para parceiros e agências.
- Integração autorizada com CRM ou planilhas.
- Gerador de imagens sociais e vídeos curtos.
- Assistente de respostas para leads baseado exclusivamente na ficha do imóvel.
- Templates por estado e regras internas de imobiliárias.
- White-label para pequenas agências.

## Bugs e qualidade

Todo bug que causar perda de dados, vazamento entre usuários, cobrança incorreta, exposição de chave, geração sem limite ou exportação incorreta é P0. Problemas visuais menores podem ser P1, desde que não impeçam uso em mobile ou desktop.
