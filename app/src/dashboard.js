import { supabase } from "./supabaseClient.js";
import { listProperties, listDevelopments, duplicateProperty, deleteProperty, updateProperty, getProperty } from "./api.js";
import { renderPropertyFormScreen } from "./propertyForm.js";
import { renderPackageEditorScreen } from "./packageEditor.js";

const STATUS_LABEL = {
  rascunho: "Rascunho",
  gerado: "Gerado",
  revisando: "Revisando",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

export async function renderDashboardScreen() {
  await renderList({ q: "", status: "" });
}

async function renderList(filters) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <header class="topbar">
      <span class="wordmark serif">Anuncia</span>
      <div style="display: flex; gap: 10px;">
        <a href="/empreendimentos">Empreendimentos</a>
        <a href="/plano">Meu plano</a>
        <button type="button" id="logout-btn">Sair</button>
      </div>
    </header>
    <div class="dashboard">
      <header class="dashboard-header">
        <div>
          <h1 class="auth-title">Seus lançamentos</h1>
        </div>
      </header>

      <div id="onboarding-block"></div>

      <div class="dashboard-toolbar">
        <input type="text" id="search-input" placeholder="Buscar por título, cidade ou bairro" value="${filters.q}" />
        <select id="status-filter">
          <option value="">Todos os status</option>
          ${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${filters.status === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
        <button type="button" id="new-property-btn">+ Novo imóvel</button>
      </div>

      <div id="properties-list" class="properties-list"><p class="auth-subtitle">Carregando...</p></div>
    </div>
  `;

  document.querySelector("#logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });

  document.querySelector("#new-property-btn").addEventListener("click", () => {
    renderPropertyFormScreen(null, () => renderList(filters), () => renderList(filters));
  });

  let searchTimeout;
  document.querySelector("#search-input").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const q = e.target.value;
    searchTimeout = setTimeout(() => renderList({ ...filters, q }), 350);
  });

  document.querySelector("#status-filter").addEventListener("change", (e) => {
    renderList({ ...filters, status: e.target.value });
  });

  const listEl = document.querySelector("#properties-list");
  try {
    const [properties, developments] = await Promise.all([
      listProperties(filters),
      listDevelopments().catch(() => []), // não bloqueia a lista de imóveis se falhar
    ]);
    const devNameById = Object.fromEntries(developments.map((d) => [d.id, d.nome]));
    listEl.innerHTML = properties.length
      ? properties.map((p) => renderCard(p, devNameById)).join("")
      : `<p class="auth-subtitle">Nenhum imóvel encontrado. Clique em "+ Novo imóvel" pra começar.</p>`;
    wireCardActions(listEl, filters);

    // "Comece por aqui" some sozinho assim que o corretor já gerou 1 pacote —
    // não é dispensável manualmente, é condicionado ao estado real dos dados.
    const jaGerouPacote = properties.some((p) => p.status !== "rascunho");
    document.querySelector("#onboarding-block").innerHTML = jaGerouPacote ? "" : renderOnboarding();
  } catch (err) {
    listEl.innerHTML = `<p class="auth-error">Erro ao carregar imóveis: ${err.message}</p>`;
  }
}

function renderOnboarding() {
  const steps = [
    { title: "Cadastre seu primeiro imóvel", text: "Preencha os dados básicos — ou cole um texto solto e deixe a gente organizar os campos pra você." },
    { title: "Gere o pacote completo", text: "Descrição, Instagram, WhatsApp e mais 6 materiais prontos pra revisar, em segundos." },
    { title: "Revise e publique", text: "Ajuste o que quiser, copie e publique no seu canal preferido." },
  ];
  return `
    <div class="getting-started">
      <h2 class="auth-title" style="font-size: 1.4rem; margin-bottom: 4px;">Comece por aqui</h2>
      <p class="auth-subtitle" style="margin-bottom: 0;">Três passos até o primeiro pacote de lançamento pronto.</p>
      <div class="getting-started-steps">
        ${steps.map((s, i) => `
          <div class="getting-started-step">
            <p class="diff-num">${String(i + 1).padStart(2, "0")}</p>
            <h3>${s.title}</h3>
            <p>${s.text}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCard(p, devNameById = {}) {
  const devNome = p.development_id ? devNameById[p.development_id] : null;
  return `
    <div class="property-card" data-id="${p.id}">
      <div class="property-card-photo" ${p.capa_url ? `style="background: url('${p.capa_url}') center/cover no-repeat;"` : ""}>
        <span class="property-status status-${p.status}">${STATUS_LABEL[p.status] || p.status}</span>
      </div>
      <div class="property-card-main">
        ${devNome ? `<p class="eyebrow property-dev-badge">${devNome}</p>` : ""}
        <h3>${p.titulo_interno}</h3>
        <p class="auth-subtitle">${[p.tipo, p.bairro, p.cidade].filter(Boolean).join(" · ") || "Sem detalhes ainda"}</p>
        ${p.preco ? `<p class="property-price">R$ ${Number(p.preco).toLocaleString("pt-BR")}</p>` : ""}
      </div>
      <div class="property-card-actions">
        <button type="button" class="btn-secondary" data-action="package">${p.status === "rascunho" ? "Gerar pacote" : "Ver pacote"}</button>
        <button type="button" class="btn-secondary" data-action="edit">Editar</button>
        <button type="button" class="btn-secondary" data-action="duplicate">Duplicar</button>
        <button type="button" class="btn-secondary" data-action="archive">${p.status === "arquivado" ? "Desarquivar" : "Arquivar"}</button>
        <button type="button" class="btn-danger-link" data-action="delete">Excluir</button>
      </div>
    </div>
  `;
}

function wireCardActions(listEl, filters) {
  listEl.querySelectorAll(".property-card").forEach((card) => {
    const id = card.dataset.id;

    card.querySelector('[data-action="package"]').addEventListener("click", async () => {
      const property = await getProperty(id);
      renderPackageEditorScreen(property, () => renderList(filters));
    });

    card.querySelector('[data-action="edit"]').addEventListener("click", async () => {
      const property = await getProperty(id);
      renderPropertyFormScreen(property, () => renderList(filters), () => renderList(filters));
    });

    card.querySelector('[data-action="duplicate"]').addEventListener("click", async () => {
      await duplicateProperty(id);
      renderList(filters);
    });

    card.querySelector('[data-action="archive"]').addEventListener("click", async () => {
      const isArchived = card.querySelector(".property-status").textContent === "Arquivado";
      await updateProperty(id, { status: isArchived ? "rascunho" : "arquivado" });
      renderList(filters);
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Excluir esse imóvel? Não tem como desfazer.")) return;
      await deleteProperty(id);
      renderList(filters);
    });
  });
}
