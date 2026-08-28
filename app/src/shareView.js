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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

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

  const { property, assets, profile, media } = data;
  const assetByType = Object.fromEntries(assets.map((a) => [a.tipo, a]));
  const price = property.preco ? `R$ ${Number(property.preco).toLocaleString("pt-BR")}` : "";
  const local = [property.bairro, property.cidade].filter(Boolean).join(", ");
  const cover = media?.[0];
  const gallery = (media || []).slice(1);

  const specs = [];
  if (property.dormitorios) specs.push(`${property.dormitorios} dorm`);
  if (property.suites) specs.push(`${property.suites} suítes`);
  if (property.banheiros) specs.push(`${property.banheiros} banheiros`);
  if (property.vagas) specs.push(`${property.vagas} vagas`);
  if (property.area_privativa) specs.push(`${property.area_privativa}m²`);

  const whatsappDigits = digitsOnly(profile?.contatos?.whatsapp);
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`}` : "";

  const otherAssets = ASSET_ORDER.filter((t) => t !== "long_description" && assetByType[t]);

  app.innerHTML = `
    <div class="mini-site">
      <div class="mini-hero ${cover ? "" : "mini-hero-empty"}" ${cover ? `style="background-image: url('${cover.url}')"` : ""}>
        <span class="wordmark serif mini-hero-wordmark">Anuncia</span>
        <div class="mini-hero-copy">
          ${assetByType.headline ? `<p class="hero-eyebrow">${escapeHtml(assetByType.headline.conteudo)}</p>` : ""}
          <h1>${escapeHtml(property.titulo_interno)}</h1>
          <div class="mini-hero-facts">
            ${price ? `<span class="mini-hero-price">${price}</span>` : ""}
            ${local ? `<span>${escapeHtml(local)}</span>` : ""}
          </div>
        </div>
      </div>

      ${specs.length ? `<div class="mini-specs">${specs.map((s) => `<span>${s}</span>`).join("")}</div>` : ""}

      ${gallery.length ? `
        <div class="mini-gallery">
          ${gallery.map((m) => `<div class="mini-gallery-item" style="background-image: url('${m.url}')"></div>`).join("")}
        </div>
      ` : ""}

      <div class="mini-body">
        ${assetByType.long_description ? `<p class="share-content">${escapeHtml(assetByType.long_description.conteudo)}</p>` : ""}
      </div>

      ${profile?.nome_publico ? `
        <div class="mini-contact">
          <p class="warnings-title">Contato</p>
          <p class="auth-subtitle" style="margin-bottom: 16px;">${escapeHtml(profile.nome_publico)}${profile.imobiliaria ? ` · ${escapeHtml(profile.imobiliaria)}` : ""}</p>
          ${whatsappUrl ? `<a class="btn-cta" href="${whatsappUrl}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ""}
        </div>
      ` : ""}

      ${otherAssets.length ? `
        <details class="mini-more">
          <summary>Ver outros textos gerados (Instagram, e-mail, roteiro de Reel...)</summary>
          <div class="editor-pane mini-more-pane">
            ${otherAssets.map((t) => `
              <div class="share-asset">
                <h3>${ASSET_LABELS[t]}</h3>
                <pre class="share-content">${escapeHtml(assetByType[t].conteudo)}</pre>
                <button type="button" class="btn-secondary" data-copy="${t}">Copiar</button>
              </div>
            `).join("")}
          </div>
        </details>
      ` : ""}

      <p class="legal-fineprint mini-fineprint">Compartilhado por ${escapeHtml(profile?.nome_publico || "um corretor")} via Anuncia — pode receber ajustes antes da publicação final.</p>
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
