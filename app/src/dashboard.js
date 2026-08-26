import { supabase } from "./supabaseClient.js";
import { listProperties, duplicateProperty, deleteProperty, updateProperty, getProperty } from "./api.js";
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
    <div class="dashboard">
      <header class="dashboard-header">
        <h1 class="auth-title">Anuncia</h1>
        <button type="button" id="logout-btn" class="btn-secondary">Sair</button>
      </header>

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
    const properties = await listProperties(filters);
    listEl.innerHTML = properties.length
      ? properties.map(renderCard).join("")
      : `<p class="auth-subtitle">Nenhum imóvel encontrado. Clique em "+ Novo imóvel" pra começar.</p>`;
    wireCardActions(listEl, filters);
  } catch (err) {
    listEl.innerHTML = `<p class="auth-error">Erro ao carregar imóveis: ${err.message}</p>`;
  }
}

function renderCard(p) {
  return `
    <div class="property-card" data-id="${p.id}">
      <div class="property-card-main">
        <span class="property-status status-${p.status}">${STATUS_LABEL[p.status] || p.status}</span>
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
