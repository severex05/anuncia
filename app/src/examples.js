const EXEMPLOS = [
  {
    titulo: "Apartamento 2 dormitórios · Vila Mariana, São Paulo",
    facts: "Apartamento · Vila Mariana · São Paulo",
    price: "R$ 450.000",
    corretor: "Corretora fictícia usada só pra ilustrar o formato do pacote.",
    assets: [
      {
        tipo: "Descrição longa",
        conteudo: "Reformado do chão ao teto, este 2 dormitórios na Vila Mariana está a poucos minutos a pé do metrô — ideal pra quem valoriza tempo. A sala integrada recebe luz da manhã, a cozinha foi totalmente renovada e a sacada com churrasqueira vira o point dos fins de semana. Prédio com portaria 24h e vaga de garagem coberta.\n\n65m² privativos, 1 vaga, condomínio com valor a confirmar. Agende uma visita e veja de perto.",
      },
      {
        tipo: "Instagram",
        conteudo: "Reformado e a poucos passos do metrô — o 2 dormitórios da Vila Mariana que você estava esperando. 🏡\n\nSacada com churrasqueira, cozinha nova em folha, portaria 24h.\n\nManda mensagem que te conto mais 👇",
      },
      {
        tipo: "WhatsApp",
        conteudo: "Oi! Separei um apê reformado na Vila Mariana pra você: 2 dorms, 65m², 1 vaga, pertinho do metrô. Tem sacada com churrasqueira e a cozinha é toda nova. Posso te mandar as fotos?",
      },
      {
        tipo: "Chamada",
        conteudo: "Vila Mariana reformado, a pé do metrô",
      },
    ],
  },
  {
    titulo: "Casa 3 suítes · Alphaville, Barueri",
    facts: "Casa em condomínio · Alphaville · Barueri",
    price: "R$ 1.850.000",
    corretor: "Corretor fictício usado só pra ilustrar o formato do pacote.",
    assets: [
      {
        tipo: "Descrição longa",
        conteudo: "Casa térrea em condomínio fechado, com 3 suítes, escritório e área gourmet completa com piscina. Terreno de 450m², construção de 320m². Acabamento de alto padrão, closet na suíte master, e segurança 24h com portaria e ronda.\n\nA 5 minutos do Tamboré Shopping e com fácil acesso à Castello Branco. Pronto pra morar, condomínio com infraestrutura de lazer completa.",
      },
      {
        tipo: "Instagram",
        conteudo: "Alphaville pede uma casa assim. 🏠✨\n\n3 suítes, área gourmet com piscina, 320m² de construção num terreno de 450m². Segurança 24h e acesso rápido pra Castello Branco.\n\nDá pra imaginar seu domingo aqui?",
      },
      {
        tipo: "E-mail",
        conteudo: "Assunto: Casa em Alphaville que separei pra você\n\nOlá!\n\nEncontrei uma casa que combina com o que você me contou: 3 suítes, área gourmet completa com piscina e um terreno generoso de 450m² em condomínio fechado com segurança 24h.\n\nFica a 5 minutos do Tamboré Shopping, com acesso fácil à Castello Branco. Posso te enviar mais fotos ou agendar uma visita ainda essa semana?",
      },
      {
        tipo: "Chamada",
        conteudo: "Casa 3 suítes em Alphaville, pronta pra morar",
      },
    ],
  },
];

export function renderExamplesScreen(onBack, onSignup) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <header class="topbar">
      <span class="wordmark serif">Anuncia</span>
      <button type="button" id="examples-back-btn">Voltar</button>
    </header>
    <div class="dashboard examples-page">
      <header class="dashboard-header">
        <div>
          <h1 class="auth-title">Exemplos de pacote de lançamento</h1>
          <p class="auth-subtitle">Dois imóveis fictícios, só pra você ver o formato e o tom do material antes de cadastrar o seu.</p>
        </div>
      </header>
      <p class="examples-badge">Exemplo ilustrativo — imóveis, preços e corretores fictícios</p>

      ${EXEMPLOS.map((ex) => `
        <section class="example-property">
          <div class="property-card-photo example-photo"></div>
          <h2 class="example-title">${ex.titulo}</h2>
          <p class="auth-subtitle">${ex.facts} · ${ex.price}</p>
          <p class="disclaimer auth-subtitle">${ex.corretor}</p>
          <div class="editor-pane">
            ${ex.assets.map((a) => `
              <div class="share-asset">
                <h3>${a.tipo}</h3>
                <pre class="share-content">${a.conteudo}</pre>
              </div>
            `).join("")}
          </div>
        </section>
      `).join("")}

      <section class="landing-cta-mid examples-cta">
        <button type="button" class="btn-cta btn-cta-lg" id="examples-signup">Criar meu pacote grátis</button>
      </section>
    </div>
  `;

  document.querySelector("#examples-back-btn").addEventListener("click", onBack);
  document.querySelector("#examples-signup").addEventListener("click", () => onSignup("signup"));
}
