import { getPublicCorretor } from "./api.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function socialUrl(handle, base) {
  const h = String(handle || "").trim();
  if (!h) return "";
  if (h.startsWith("http")) return h;
  return `${base}${h.replace(/^@/, "")}`;
}

// Página institucional pública do corretor (/c/:slug) — "cartão de
// visitas" digital, sem sessão, mesmo padrão de shareView.js: busca os
// dados curados do backend e renderiza, sem checar auth em nenhum momento.
export async function renderCorretorPublicoScreen(slug) {
  const app = document.querySelector("#app");
  app.innerHTML = `<div class="profile-screen"><p class="auth-subtitle">Carregando...</p></div>`;

  let data;
  try {
    data = await getPublicCorretor(slug);
  } catch (err) {
    app.innerHTML = `
      <div class="profile-screen">
        <div class="profile-card">
          <h1 class="auth-title">Página não encontrada</h1>
          <p class="auth-subtitle">Esse link não existe ou foi desativado pelo corretor.</p>
        </div>
      </div>
    `;
    return;
  }

  const { profile, imoveis } = data;
  const local = [profile.cidade, profile.estado].filter(Boolean).join(" - ");
  const whatsappDigits = digitsOnly(profile.contatos?.whatsapp);
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits.startsWith("55") ? whatsappDigits : `55${whatsappDigits}`}` : "";
  const instagramUrl = socialUrl(profile.redes_sociais?.instagram, "https://instagram.com/");
  const facebookUrl = socialUrl(profile.redes_sociais?.facebook, "https://facebook.com/");

  app.innerHTML = `
    <div class="mini-site broker-page">
      <div class="mini-hero mini-hero-empty broker-hero">
        <span class="wordmark serif mini-hero-wordmark">Anuncia</span>
        <div class="broker-hero-body">
          ${profile.foto_perfil_url ? `<img class="broker-hero-photo" src="${profile.foto_perfil_url}" alt="${escapeHtml(profile.nome_publico)}" />` : ""}
          <div class="mini-hero-copy">
            <h1>${escapeHtml(profile.nome_publico || "Corretor")}</h1>
            <div class="mini-hero-facts">
              ${profile.creci ? `<span>CRECI ${escapeHtml(profile.creci)}</span>` : ""}
              ${profile.imobiliaria ? `<span>${escapeHtml(profile.imobiliaria)}</span>` : ""}
              ${local ? `<span>${escapeHtml(local)}</span>` : ""}
            </div>
          </div>
        </div>
      </div>

      ${profile.apresentacao ? `
        <div class="mini-body">
          <p class="share-content">${escapeHtml(profile.apresentacao)}</p>
        </div>
      ` : ""}

      <div class="broker-portfolio">
        <p class="warnings-title broker-portfolio-title">Imóveis</p>
        ${imoveis.length
          ? `<div class="properties-list broker-portfolio-grid">${imoveis.map(renderImovelCard).join("")}</div>`
          : `<p class="auth-subtitle">Nenhum imóvel publicado no portfólio no momento.</p>`}
      </div>

      <div class="mini-contact">
        <p class="warnings-title">Contato</p>
        <p class="auth-subtitle" style="margin-bottom: 16px;">Fale direto com ${escapeHtml(profile.nome_publico || "o corretor")}.</p>
        <div class="broker-contact-actions">
          ${whatsappUrl ? `<a class="btn-cta" href="${whatsappUrl}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ""}
          ${instagramUrl ? `<a class="btn-ghost" href="${instagramUrl}" target="_blank" rel="noopener">Instagram</a>` : ""}
          ${facebookUrl ? `<a class="btn-ghost" href="${facebookUrl}" target="_blank" rel="noopener">Facebook</a>` : ""}
        </div>
      </div>

      <p class="legal-fineprint mini-fineprint">Página pública de ${escapeHtml(profile.nome_publico || "um corretor")} via Anuncia.</p>
    </div>
  `;
}

function renderImovelCard(imovel) {
  const price = imovel.preco ? `R$ ${Number(imovel.preco).toLocaleString("pt-BR")}` : "";
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");
  const facts = [imovel.tipo, imovel.operacao].filter(Boolean).join(" · ");
  const card = `
    <div class="property-card broker-property-card">
      <div class="property-card-photo" ${imovel.capa_url ? `style="background: url('${imovel.capa_url}') center/cover no-repeat;"` : ""}></div>
      <div class="property-card-main">
        <h3>${escapeHtml(imovel.titulo)}</h3>
        <p class="auth-subtitle">${escapeHtml(facts || local)}</p>
        ${local && facts ? `<p class="auth-subtitle">${escapeHtml(local)}</p>` : ""}
        ${price ? `<p class="property-price">${price}</p>` : ""}
      </div>
    </div>
  `;
  if (!imovel.share_token) return card;
  return `<a class="property-card-link" href="/share/${imovel.share_token}" target="_blank" rel="noopener">${card}</a>`;
}
