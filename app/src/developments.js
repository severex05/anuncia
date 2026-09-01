// Roadmap Later: modo empreendimento/lançamento. Cadastra os fatos
// compartilhados de um prédio uma vez (incorporadora, diferenciais de área
// comum, previsão de entrega) — cada unidade continua sendo um imóvel normal
// (propertyForm.js), só vinculado via development_id, reaproveitando 100% do
// fluxo de geração/edição/exportação já existente.

import { listDevelopments, createDevelopment, updateDevelopment, deleteDevelopment } from "./api.js";

function toList(v) {
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function renderDevelopmentsScreen(onBack) {
  const app = document.querySelector("#app");
  const state = {
    view: "list", // "list" | "form"
    loading: true,
    error: "",
    developments: [],
    editing: null, // registro sendo editado, ou null pra criação
    saving: false,
    f: emptyForm(),
  };

  function emptyForm() {
    return {
      nome: "", incorporadora: "", cidade: "", bairro: "",
      endereco_publico: "", descricao_geral: "", diferenciais: "", previsao_entrega: "",
    };
  }

  async function load() {
    state.loading = true;
    render();
    try {
      state.developments = await listDevelopments();
    } catch (err) {
      state.error = err.message;
    }
    state.loading = false;
    render();
  }

  function openCreate() {
    state.view = "form";
    state.editing = null;
    state.f = emptyForm();
    state.error = "";
    render();
  }

  function openEdit(dev) {
    state.view = "form";
    state.editing = dev;
    state.f = {
      nome: dev.nome || "",
      incorporadora: dev.incorporadora || "",
      cidade: dev.cidade || "",
      bairro: dev.bairro || "",
      endereco_publico: dev.endereco_publico || "",
      descricao_geral: dev.descricao_geral || "",
      diferenciais: (dev.diferenciais || []).join(", "),
      previsao_entrega: dev.previsao_entrega || "",
    };
    state.error = "";
    render();
  }

  async function save() {
    if (!state.f.nome.trim()) {
      state.error = "Nome do empreendimento é obrigatório.";
      render();
      return;
    }
    state.saving = true;
    state.error = "";
    render();
    const payload = {
      nome: state.f.nome.trim(),
      incorporadora: state.f.incorporadora.trim(),
      cidade: state.f.cidade.trim(),
      bairro: state.f.bairro.trim(),
      endereco_publico: state.f.endereco_publico.trim(),
      descricao_geral: state.f.descricao_geral.trim(),
      diferenciais: toList(state.f.diferenciais),
      previsao_entrega: state.f.previsao_entrega.trim(),
    };
    try {
      if (state.editing) await updateDevelopment(state.editing.id, payload);
      else await createDevelopment(payload);
      state.view = "list";
      state.saving = false;
      await load();
    } catch (err) {
      state.error = err.message;
      state.saving = false;
      render();
    }
  }

  async function remove(dev) {
    const aviso = dev.unidades_count
      ? `Excluir "${dev.nome}"? As ${dev.unidades_count} unidade(s) vinculadas continuam existindo, só perdem o vínculo com o empreendimento.`
      : `Excluir "${dev.nome}"?`;
    if (!confirm(aviso)) return;
    try {
      await deleteDevelopment(dev.id);
      await load();
    } catch (err) {
      state.error = err.message;
      render();
    }
  }

  function renderList() {
    return `
      <div class="dashboard" style="max-width: 780px;">
        <header class="dashboard-header">
          <h1 class="auth-title">Empreendimentos</h1>
          <button type="button" id="new-dev-btn">+ Novo empreendimento</button>
        </header>
        <p class="auth-subtitle">Cadastre um lançamento uma vez e reaproveite os dados ao criar cada unidade (imóvel).</p>

        ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

        ${state.loading ? `<p class="auth-subtitle">Carregando...</p>` : state.developments.length ? `
          <div class="properties-list">
            ${state.developments.map((d) => `
              <div class="property-card" data-id="${d.id}">
                <div class="property-card-main">
                  <h3>${d.nome}</h3>
                  <p class="auth-subtitle">${[d.incorporadora, d.bairro, d.cidade].filter(Boolean).join(" · ") || "Sem detalhes ainda"}</p>
                  <p class="field-hint">${d.unidades_count || 0} unidade(s) vinculada(s)</p>
                </div>
                <div class="property-card-actions">
                  <button type="button" class="btn-secondary" data-action="edit">Editar</button>
                  <button type="button" class="btn-danger-link" data-action="delete">Excluir</button>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `<p class="auth-subtitle">Nenhum empreendimento cadastrado ainda. Clique em "+ Novo empreendimento" pra começar.</p>`}
      </div>
    `;
  }

  function renderForm() {
    const f = state.f;
    return `
      <div class="dashboard" style="max-width: 640px;">
        <h1 class="auth-title">${state.editing ? "Editar empreendimento" : "Novo empreendimento"}</h1>
        <form id="dev-form" class="profile-form">
          <label>Nome do empreendimento
            <input type="text" data-f="nome" value="${f.nome}" placeholder="Residencial Jardins da Serra" required />
          </label>
          <label>Incorporadora
            <input type="text" data-f="incorporadora" value="${f.incorporadora}" />
          </label>
          <div class="profile-row">
            <label>Cidade
              <input type="text" data-f="cidade" value="${f.cidade}" />
            </label>
            <label>Bairro
              <input type="text" data-f="bairro" value="${f.bairro}" />
            </label>
          </div>
          <label>Endereço público
            <input type="text" data-f="endereco_publico" value="${f.endereco_publico}" />
          </label>
          <label>Descrição geral do empreendimento
            <textarea data-f="descricao_geral" rows="3">${f.descricao_geral}</textarea>
          </label>
          <label>Diferenciais de área comum (separe por vírgula)
            <input type="text" data-f="diferenciais" value="${f.diferenciais}" placeholder="piscina, academia, salão de festas, portaria 24h" />
          </label>
          <label>Previsão de entrega
            <input type="text" data-f="previsao_entrega" value="${f.previsao_entrega}" placeholder="dez/2027" />
          </label>
        </form>

        ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

        <div class="profile-actions" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); justify-content: flex-end;">
          <button type="button" id="dev-cancel-btn" class="btn-secondary">Cancelar</button>
          <button type="button" id="dev-save-btn" ${state.saving ? "disabled" : ""}>${state.saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    `;
  }

  function render() {
    app.innerHTML = `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="back-btn">Voltar</button>
      </header>
      ${state.view === "form" ? renderForm() : renderList()}
    `;

    document.querySelector("#back-btn").addEventListener("click", () => {
      if (state.view === "form") { state.view = "list"; state.error = ""; render(); }
      else onBack();
    });

    if (state.view === "list") {
      const newBtn = document.querySelector("#new-dev-btn");
      if (newBtn) newBtn.addEventListener("click", openCreate);
      document.querySelectorAll(".property-card").forEach((card) => {
        const dev = state.developments.find((d) => d.id === card.dataset.id);
        card.querySelector('[data-action="edit"]').addEventListener("click", () => openEdit(dev));
        card.querySelector('[data-action="delete"]').addEventListener("click", () => remove(dev));
      });
    } else {
      document.querySelectorAll("[data-f]").forEach((el) => {
        const field = el.dataset.f;
        el.addEventListener("input", () => { state.f[field] = el.value; });
      });
      document.querySelector("#dev-cancel-btn").addEventListener("click", () => {
        state.view = "list";
        state.error = "";
        render();
      });
      document.querySelector("#dev-save-btn").addEventListener("click", save);
    }
  }

  await load();
}
