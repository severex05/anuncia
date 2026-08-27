const DIFERENCIAIS = [
  { titulo: "Primeiro valor em minutos", texto: "Cadastra o imóvel e já sai com o pacote pronto pra revisar." },
  { titulo: "Escrita como corretor brasileiro fala", texto: "Nada de texto genérico traduzido — linguagem natural pro seu mercado." },
  { titulo: "Sempre na sua voz", texto: "Usa seus exemplos, suas palavras preferidas e as que você nunca usaria." },
  { titulo: "Nunca inventa dado", texto: "Só usa o que você informou — o que falta vira alerta, não invenção." },
  { titulo: "Revisão antes de publicar", texto: "Alertas de inconsistência e exagero, pra você aprovar com segurança." },
  { titulo: "Funciona no celular", texto: "Copie e compartilhe direto do WhatsApp e do Instagram, sem editor complicado." },
];

const PLANOS = [
  {
    nome: "Teste grátis",
    preco: "R$0",
    periodo: "",
    resumo: "1 pacote completo, sem cartão",
    indicado: "Pra quem quer ver a qualidade antes de decidir",
    itens: ["9 tipos de material por lançamento", "Alertas de revisão antes de publicar", "Exportar e compartilhar"],
    cta: "Criar conta grátis",
    destaque: false,
  },
  {
    nome: "Solo",
    preco: "R$97",
    periodo: "/mês",
    resumo: "Até 10 lançamentos por mês",
    indicado: "Pra quem toca a carteira sozinho e não tem tempo de escrever tudo do zero toda vez",
    itens: ["Tudo do plano grátis", "Histórico de versões", "Regeneração com instrução rápida"],
    cta: "Começar grátis",
    destaque: true,
  },
  {
    nome: "Pro",
    preco: "R$147",
    periodo: "/mês",
    resumo: "Até 25 lançamentos por mês",
    indicado: "Pra quem lança imóvel toda semana ou tem mais de uma carteira",
    itens: ["Tudo do plano Solo", "Volume pra quem lança toda semana", "Prioridade no suporte"],
    cta: "Começar grátis",
    destaque: false,
  },
];

const FAQ = [
  {
    p: "Preciso saber escrever alguma coisa especial?",
    r: "Não. Você preenche os dados do imóvel — nome, preço, características — e recebe o pacote pronto pra revisar.",
  },
  {
    p: "O conteúdo sai pronto pra publicar direto?",
    r: "Sai como um rascunho de trabalho. Recomendamos sempre revisar fatos, preço e disponibilidade antes de publicar — a tela de revisão mostra alertas pra te ajudar nisso.",
  },
  {
    p: "Vocês inventam alguma informação sobre o imóvel?",
    r: "Não. Só usamos o que você informou. Quando falta um dado importante pro texto, isso vira um alerta — nunca uma invenção.",
  },
  {
    p: "Como funciona o plano grátis?",
    r: "Você cria a conta e gera 1 pacote completo sem precisar de cartão de crédito. Depois disso, escolhe entre os planos Solo ou Pro.",
  },
  {
    p: "O que acontece se eu passar do limite de lançamentos do meu plano?",
    r: "Você sempre vê no app quantos lançamentos já usou. Ao atingir o limite, os pacotes que você já gerou continuam disponíveis normalmente — só ficam bloqueados os novos, até o mês virar ou você trocar de plano.",
  },
  {
    p: "Meus dados e os do imóvel ficam seguros?",
    r: "Sim. Seus dados ficam vinculados só à sua conta — nenhum outro corretor tem acesso ao que você cadastra.",
  },
  {
    p: "Posso cancelar quando quiser?",
    r: "Sim, sem fidelidade. É só falar com a gente.",
  },
];

export function renderLandingScreen(onEnter) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="landing">
      <header class="landing-nav">
        <span class="wordmark serif">Anuncia</span>
        <nav class="landing-nav-links">
          <a href="#planos">Preços</a>
          <a href="/exemplos">Exemplos</a>
        </nav>
        <div class="landing-nav-actions">
          <button type="button" class="link-btn" id="nav-login">Entrar</button>
          <button type="button" class="btn-cta" id="nav-signup">Criar conta grátis</button>
        </div>
      </header>

      <section class="landing-hero">
        <div class="landing-hero-inner">
          <div class="landing-hero-copy">
            <p class="hero-eyebrow">Feito pra corretor de imóveis autônomo</p>
            <h1>Cadastre o imóvel uma vez.<br/>Publique em <em>todo canal</em>.</h1>
            <p>Descrição, Instagram, WhatsApp, e-mail e roteiro de Reel — prontos a partir dos dados reais do seu imóvel, na sua voz. Você revisa, aprova e publica.</p>
            <div class="landing-hero-actions">
              <button type="button" class="btn-cta btn-cta-lg" id="hero-signup">Criar conta grátis</button>
              <a href="#demo" class="btn-ghost">Ver como funciona</a>
            </div>
            <p class="landing-trust">1 pacote completo grátis · sem cartão de crédito</p>
          </div>

          <div class="landing-hero-visual">
            <div class="demo-card demo-input">
              <p class="demo-card-label">Você cadastra</p>
              <p class="demo-input-title">Apto 2 dorms · Vila Mariana</p>
              <p class="demo-input-line">R$ 450.000 · 65m² · 1 vaga</p>
            </div>
            <div class="demo-arrow" aria-hidden="true">→</div>
            <div class="demo-output-stack">
              <div class="demo-card demo-output">
                <p class="demo-card-label">Instagram</p>
                <p class="demo-output-text">"Reformado e a poucos passos do metrô — o 2 dormitórios da Vila Mariana que você estava esperando. 🏡"</p>
              </div>
              <div class="demo-card demo-output">
                <p class="demo-card-label">WhatsApp</p>
                <p class="demo-output-text">"Oi! Separei um apê reformado na Vila Mariana, 2 dorms, pertinho do metrô."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-trust-bar">
        <div class="trust-item"><span class="trust-num">1</span><span class="trust-label">cadastro</span></div>
        <div class="trust-item"><span class="trust-num">9</span><span class="trust-label">materiais completos</span></div>
        <div class="trust-item"><span class="trust-num">✓</span><span class="trust-label">revisão antes de publicar</span></div>
      </section>

      <section class="landing-section">
        <p class="eyebrow">O problema</p>
        <h2>O mesmo imóvel, pra escrever de cinco jeitos diferentes</h2>
        <ul class="pain-list">
          <li>Você repete os mesmos dados do imóvel em cada canal, um por um.</li>
          <li>Adapta o texto na correria antes de publicar — e às vezes esquece um canal.</li>
          <li>O resultado sai inconsistente: hoje profissional, amanhã apressado.</li>
        </ul>
      </section>

      <section class="landing-section demo-section" id="demo">
        <p class="eyebrow">Como funciona</p>
        <h2>De um cadastro a um lançamento completo</h2>
        <div class="demo-flow">
          <div class="demo-card demo-input">
            <p class="demo-card-label">Você cadastra</p>
            <p class="demo-input-title">Apto 2 dorms · Vila Mariana</p>
            <p class="demo-input-line">R$ 450.000 · 65m² · 1 vaga</p>
            <p class="demo-input-line">"Reformado, perto do metrô, sacada com churrasqueira"</p>
          </div>
          <div class="demo-arrow" aria-hidden="true">→</div>
          <div class="demo-output-stack">
            <div class="demo-card demo-output">
              <p class="demo-card-label">Instagram</p>
              <p class="demo-output-text">"Reformado e a poucos passos do metrô — o 2 dormitórios da Vila Mariana que você estava esperando. Sacada com churrasqueira inclusa. 🏡"</p>
            </div>
            <div class="demo-card demo-output">
              <p class="demo-card-label">WhatsApp</p>
              <p class="demo-output-text">"Oi! Separei um apê reformado na Vila Mariana, 2 dorms, pertinho do metrô. Posso te mandar mais detalhes?"</p>
            </div>
            <div class="demo-card demo-output">
              <p class="demo-card-label">Chamada</p>
              <p class="demo-output-text">"Vila Mariana reformado, a pé do metrô"</p>
            </div>
          </div>
        </div>
        <p class="demo-caption">Exemplo ilustrativo — o pacote real tem 9 materiais completos por lançamento. <a href="/exemplos" id="demo-see-more">Ver mais exemplos completos →</a></p>
      </section>

      <section class="landing-section">
        <p class="eyebrow">Por que a Anuncia</p>
        <h2>Feita pra quem vive de Instagram e WhatsApp</h2>
        <div class="diff-grid">
          ${DIFERENCIAIS.map((d, i) => `
            <div class="diff-item">
              <p class="diff-num">${String(i + 1).padStart(2, "0")}</p>
              <p class="diff-title">${d.titulo}</p>
              <p class="diff-text">${d.texto}</p>
            </div>
          `).join("")}
        </div>
        <div class="landing-cta-mid">
          <button type="button" class="btn-cta btn-cta-lg" id="mid-signup">Criar conta grátis</button>
        </div>
      </section>

      <section class="landing-section" id="planos">
        <p class="eyebrow">Planos</p>
        <h2>Comece grátis. Cresça quando fizer sentido.</h2>
        <div class="pricing-grid">
          ${PLANOS.map((p, i) => `
            <div class="price-card ${p.destaque ? "price-card-highlight" : ""}">
              ${p.destaque ? '<p class="price-badge">Mais popular</p>' : ""}
              <p class="price-name">${p.nome}</p>
              <p class="price-value">${p.preco}<span>${p.periodo}</span></p>
              <p class="price-resumo">${p.resumo}</p>
              <p class="price-indicado">${p.indicado}</p>
              <ul class="price-items">
                ${p.itens.map((item) => `<li>${item}</li>`).join("")}
              </ul>
              <button type="button" class="btn-plan" data-plan-idx="${i}">${p.cta}</button>
              <p class="price-fidelidade">Sem fidelidade</p>
            </div>
          `).join("")}
        </div>
        <p class="landing-trust">Cancele ou mude de plano quando quiser — sem burocracia.</p>
      </section>

      <section class="landing-section">
        <p class="eyebrow">Perguntas frequentes</p>
        <h2>Antes de você criar sua conta</h2>
        <div class="faq-list">
          ${FAQ.map((f) => `
            <details class="faq-item">
              <summary>${f.p}</summary>
              <p>${f.r}</p>
            </details>
          `).join("")}
        </div>
      </section>

      <section class="landing-cta-final">
        <h2>Seu próximo imóvel, pronto pra postar em minutos.</h2>
        <button type="button" class="btn-cta btn-cta-lg" id="final-signup">Criar conta grátis</button>
      </section>

      <footer class="landing-footer">
        <span class="wordmark serif">Anuncia</span>
        <p>Feita para corretores autônomos e pequenas imobiliárias brasileiras.</p>
        <div class="landing-footer-links">
          <button type="button" class="link-btn" id="footer-login">Entrar</button>
          <a href="/termos" id="footer-terms">Termos de Uso</a>
          <a href="/privacidade" id="footer-privacy">Política de Privacidade</a>
        </div>
      </footer>

      <div id="proof-toast">
        <div class="toast-dot"></div>
        <div class="toast-avatar" id="toast-initials">RT</div>
        <div class="toast-text">
          <strong id="toast-name">Rafael T., São Paulo</strong>
          <small>criou uma conta agora</small>
        </div>
      </div>
    </div>
  `;

  const goSignup = () => onEnter("signup");
  const goLogin = () => onEnter("login");

  document.querySelector("#nav-signup").addEventListener("click", goSignup);
  document.querySelector("#hero-signup").addEventListener("click", goSignup);
  document.querySelector("#mid-signup").addEventListener("click", goSignup);
  document.querySelector("#final-signup").addEventListener("click", goSignup);
  document.querySelector("#nav-login").addEventListener("click", goLogin);
  document.querySelector("#footer-login").addEventListener("click", goLogin);
  document.querySelectorAll(".btn-plan").forEach((btn) => btn.addEventListener("click", goSignup));

  startProofToast();
}

// Prova social simulada, mesmo padrão já usado nas landings do IRYON/VYRON —
// nomes e cidades fictícios, girando em loop, pra passar sensação de atividade real.
const PROOFS = [
  { name: "Rafael T.", city: "São Paulo", initials: "RT", action: "criou uma conta agora" },
  { name: "Camila S.", city: "Curitiba", initials: "CS", action: "assinou o plano Pro" },
  { name: "Bruno A.", city: "Belo Horizonte", initials: "BA", action: "gerou o primeiro pacote de lançamento" },
  { name: "Fernanda L.", city: "Porto Alegre", initials: "FL", action: "criou uma conta agora" },
  { name: "Thiago M.", city: "Rio de Janeiro", initials: "TM", action: "assinou o plano Solo" },
  { name: "Patrícia G.", city: "Recife", initials: "PG", action: "exportou um pacote completo" },
  { name: "Eduardo V.", city: "Brasília", initials: "EV", action: "criou uma conta agora" },
  { name: "Larissa C.", city: "Fortaleza", initials: "LC", action: "assinou o plano Pro" },
];

function startProofToast() {
  const toast = document.querySelector("#proof-toast");
  if (!toast) return;
  const toastName = toast.querySelector("#toast-name");
  const toastInitials = toast.querySelector("#toast-initials");
  const toastAction = toast.querySelector("small");
  let idx = 0;

  function showProof() {
    if (!document.body.contains(toast)) return;
    const p = PROOFS[idx % PROOFS.length];
    toastName.textContent = `${p.name}, ${p.city}`;
    toastInitials.textContent = p.initials;
    toastAction.textContent = p.action;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      idx++;
      setTimeout(showProof, 7000);
    }, 4500);
  }
  setTimeout(showProof, 4000);
}
