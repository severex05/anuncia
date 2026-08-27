import { getPublicPackage } from "./api.js";

const ASSET_LABELS = {
  long_description: "Descrição longa",
  short_description: "Descrição curta",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reel_script: "Roteiro de Reel",
  headline: "Chamada",
  checklist: "Checklist",
};
const ASSET_ORDER = Object.keys(ASSET_LABELS);

export async function renderShareScreen(token) {
  const app = document.querySelector("#app");
  app.innerHTML = `<div class="profile-screen"><p class="auth-subtitle">Carregando...</p></div>`;

  let data;
  try {
    data = await getPublicPackage(token);
  } catch (err) {
    app.innerHTML = `
      <div class="profile-screen">
        <div class="profile-card">
          <h1 class="auth-title">Link indisponível</h1>
          <p class="auth-subtitle">${err.message === "Link inválido" ? "Este link não existe ou foi revogado pelo corretor." : err.message}</p>
        </div>
      </div>
    `;
    return;
  }

  const { property, assets, profile } = data;
  const assetByType = Object.fromEntries(assets.map((a) => [a.tipo, a]));
  const facts = [property.tipo, property.bairro, property.cidade].filter(Boolean).join(" · ");
  const price = property.preco ? `R$ ${Number(property.preco).toLocaleString("pt-BR")}` : "";

  app.innerHTML = `
    <header class="topbar">
      <span class="wordmark serif">Anuncia</span>
    </header>
    <div class="dashboard package-editor">
      <header class="dashboard-header">
        <div>
          <h1 class="auth-title">${property.titulo_interno}</h1>
          <p class="auth-subtitle">${facts}${price ? ` · ${price}` : ""}</p>
        </div>
      </header>

      <p class="auth-subtitle disclaimer">Este é um rascunho de trabalho compartilhado por ${profile?.nome_publico || "um corretor"}. Revise fatos, preço e disponibilidade antes de publicar.</p>

      <div class="editor-pane">
        ${ASSET_ORDER.filter((t) => assetByType[t]).map((t) => `
          <div class="share-asset">
            <h3>${ASSET_LABELS[t]}</h3>
            <pre class="share-content">${assetByType[t].conteudo}</pre>
            <button type="button" class="btn-secondary" data-copy="${t}">Copiar</button>
          </div>
        `).join("")}
      </div>

      ${profile?.nome_publico ? `
        <div class="checklist-panel">
          <p class="warnings-title">Contato</p>
          <p class="auth-subtitle">${profile.nome_publico}${profile.imobiliaria ? ` · ${profile.imobiliaria}` : ""}</p>
          ${profile.contatos?.whatsapp ? `<p class="auth-subtitle">WhatsApp: ${profile.contatos.whatsapp}</p>` : ""}
          ${profile.redes_sociais?.instagram ? `<p class="auth-subtitle">Instagram: ${profile.redes_sociais.instagram}</p>` : ""}
        </div>
      ` : ""}
    </div>
  `;

  app.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.copy;
      navigator.clipboard?.writeText(assetByType[type].conteudo).then(() => {
        const old = btn.textContent;
        btn.textContent = "Copiado!";
        setTimeout(() => { btn.textContent = old; }, 1500);
      });
    });
  });
}
