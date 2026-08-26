import {
  generatePackage, listPackages, getPackage, updateChecklist,
  updateAsset, regenerateAsset, getAssetVersions, restoreAssetVersion,
} from "./api.js";

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

const SEVERITY_LABEL = { low: "Atenção leve", medium: "Atenção", high: "Revisar antes de publicar" };
const QUICK_INSTRUCTIONS = ["Deixe mais curto", "Deixe mais direto", "Remova os emojis"];

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function checklistLines(content) {
  return (content || "")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export async function renderPackageEditorScreen(property, onBack) {
  const app = document.querySelector("#app");
  const state = {
    loading: true,
    error: "",
    packages: [],
    pkg: null,
    activeType: "long_description",
    draftContent: "",
    dirty: false,
    saving: false,
    regenInstruction: "",
    regenerating: false,
    regenWarnings: null,
    showHistory: false,
    history: null,
    lastIdempotencyKey: null,
    genAssetTypes: new Set(ASSET_ORDER),
    genInstruction: "",
    generating: false,
  };

  async function load() {
    state.loading = true;
    render();
    try {
      state.packages = await listPackages(property.id);
      const latest = state.packages.find((p) => p.status === "concluido") || state.packages[0];
      state.pkg = latest ? await getPackage(latest.id) : null;
      if (state.pkg?.assets?.length) syncDraft();
    } catch (err) {
      state.error = err.message;
    }
    state.loading = false;
    render();
  }

  function syncDraft() {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    state.draftContent = asset?.conteudo || "";
    state.dirty = false;
    state.regenWarnings = null;
    state.showHistory = false;
    state.history = null;
  }

  async function doGenerate() {
    state.generating = true;
    state.error = "";
    render();
    try {
      const idempotencyKey = state.lastIdempotencyKey || uuid();
      state.lastIdempotencyKey = idempotencyKey;
      const pkg = await generatePackage(property.id, {
        idempotencyKey,
        assetTypes: Array.from(state.genAssetTypes),
        instruction: state.genInstruction.trim() || undefined,
      });
      state.pkg = pkg;
      state.lastIdempotencyKey = null;
      syncDraft();
      state.packages = await listPackages(property.id);
    } catch (err) {
      state.error = err.message + (err.message?.includes("tentar novamente") ? "" : "");
    }
    state.generating = false;
    render();
  }

  async function saveEdit() {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    state.saving = true;
    render();
    try {
      const updated = await updateAsset(asset.id, { content: state.draftContent });
      const idx = state.pkg.assets.findIndex((a) => a.id === asset.id);
      state.pkg.assets[idx] = updated;
      state.dirty = false;
    } catch (err) {
      state.error = err.message;
    }
    state.saving = false;
    render();
  }

  async function doRegenerate(instruction) {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    state.regenerating = true;
    state.error = "";
    render();
    try {
      const updated = await regenerateAsset(asset.id, instruction);
      const idx = state.pkg.assets.findIndex((a) => a.id === asset.id);
      state.pkg.assets[idx] = updated;
      state.draftContent = updated.conteudo;
      state.dirty = false;
      state.regenWarnings = updated.warnings || [];
    } catch (err) {
      state.error = err.message;
    }
    state.regenerating = false;
    render();
  }

  async function toggleHistory() {
    state.showHistory = !state.showHistory;
    if (state.showHistory && !state.history) {
      const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
      try {
        state.history = await getAssetVersions(asset.id);
      } catch (err) {
        state.error = err.message;
      }
    }
    render();
  }

  async function doRestore(versionId) {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    try {
      const updated = await restoreAssetVersion(asset.id, versionId);
      const idx = state.pkg.assets.findIndex((a) => a.id === asset.id);
      state.pkg.assets[idx] = updated;
      state.draftContent = updated.conteudo;
      state.dirty = false;
      state.history = await getAssetVersions(asset.id);
    } catch (err) {
      state.error = err.message;
    }
    render();
  }

  async function toggleChecklistItem(index, checked) {
    try {
      const { checklist_state } = await updateChecklist(state.pkg.id, { [index]: checked });
      state.pkg.checklist_state = checklist_state;
    } catch (err) {
      state.error = err.message;
    }
    render();
  }

  function copyActive() {
    navigator.clipboard?.writeText(state.draftContent).then(() => {
      const btn = document.querySelector("#copy-btn");
      if (btn) { const old = btn.textContent; btn.textContent = "Copiado!"; setTimeout(() => { btn.textContent = old; }, 1500); }
    });
  }

  function renderGenerateForm() {
    return `
      <div class="profile-screen">
        <div class="profile-card">
          <h1 class="auth-title">Gerar pacote de lançamento</h1>
          <p class="auth-subtitle">A IA usa os dados já cadastrados do imóvel e o seu perfil de voz. O resultado é sempre um rascunho — revise antes de publicar.</p>

          <div class="checklist-list">
            ${ASSET_ORDER.map((t) => `
              <label class="checkbox-label">
                <input type="checkbox" data-gen-type="${t}" ${state.genAssetTypes.has(t) ? "checked" : ""} />
                ${ASSET_LABELS[t]}
              </label>
            `).join("")}
          </div>

          <label>Instrução opcional (ex: "destaque a proximidade do metrô")
            <textarea id="gen-instruction" rows="2">${state.genInstruction}</textarea>
          </label>

          ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

          <div class="profile-actions">
            <button type="button" id="back-btn" class="btn-secondary">Voltar</button>
            <button type="button" id="generate-btn" ${state.generating ? "disabled" : ""}>
              ${state.generating ? "Gerando... (pode levar até 30s)" : "Gerar pacote"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderWarnings() {
    const warnings = state.pkg.global_warnings || [];
    if (!warnings.length) return "";
    return `
      <div class="warnings-panel">
        <p class="warnings-title">Pontos pra revisar antes de publicar</p>
        <ul class="warnings-list">
          ${warnings.map((w) => `
            <li class="warning-item severity-${w.severidade}">
              <strong>${SEVERITY_LABEL[w.severidade] || w.severidade}:</strong> ${w.explicacao}
              ${w.trecho ? `<div class="warning-excerpt">"${w.trecho}"</div>` : ""}
              ${w.sugestao ? `<div class="warning-suggestion">Sugestão: ${w.sugestao}</div>` : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  function renderChecklist() {
    const asset = state.pkg.assets.find((a) => a.tipo === "checklist");
    if (!asset) return "";
    const items = checklistLines(asset.conteudo);
    const checked = state.pkg.checklist_state || {};
    return `
      <div class="checklist-panel">
        <p class="warnings-title">Checklist antes de exportar</p>
        <ul class="checklist-list">
          ${items.map((item, i) => `
            <li>
              <label class="checkbox-label">
                <input type="checkbox" data-checklist-idx="${i}" ${checked[i] ? "checked" : ""} />
                <span>${item}</span>
              </label>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  function renderHistory() {
    if (!state.showHistory) return "";
    if (!state.history) return `<p class="auth-subtitle">Carregando histórico...</p>`;
    if (!state.history.history.length) return `<p class="auth-subtitle">Ainda não há versões anteriores deste ativo.</p>`;
    return `
      <ul class="history-list">
        ${state.history.history.map((v) => `
          <li class="history-item">
            <div class="history-meta">v${v.versao} · ${v.origem.replace("_", " ")} · ${new Date(v.created_at).toLocaleString("pt-BR")}</div>
            <div class="history-content">${v.conteudo.slice(0, 160)}${v.conteudo.length > 160 ? "…" : ""}</div>
            <button type="button" class="btn-secondary" data-restore="${v.id}">Restaurar esta versão</button>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function renderEditor() {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    return `
      <div class="dashboard package-editor">
        <header class="dashboard-header">
          <h1 class="auth-title">${property.titulo_interno}</h1>
          <div>
            <button type="button" id="regenerate-package-btn" class="btn-secondary">Gerar novo pacote</button>
            <button type="button" id="back-btn" class="btn-secondary">Voltar</button>
          </div>
        </header>

        <p class="auth-subtitle disclaimer">Conteúdo gerado por IA — é sempre um rascunho. Revise fatos, preço, disponibilidade e fotos antes de publicar.</p>

        ${renderWarnings()}

        <div class="asset-tabs">
          ${ASSET_ORDER.map((t) => `<button type="button" class="asset-tab ${t === state.activeType ? "asset-tab-active" : ""}" data-type="${t}">${ASSET_LABELS[t]}</button>`).join("")}
        </div>

        <div class="editor-pane">
          <textarea id="asset-content" rows="10">${asset?.conteudo || ""}</textarea>

          ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

          <div class="editor-actions">
            <button type="button" id="copy-btn" class="btn-secondary">Copiar</button>
            <button type="button" id="save-btn" ${!state.dirty || state.saving ? "disabled" : ""}>${state.saving ? "Salvando..." : "Salvar edição"}</button>
            <button type="button" id="history-btn" class="btn-secondary">${state.showHistory ? "Ocultar histórico" : "Ver histórico"}</button>
          </div>

          <div class="regen-panel">
            <p class="auth-subtitle">Regenerar com instrução rápida</p>
            <div class="quick-instructions">
              ${QUICK_INSTRUCTIONS.map((q) => `<button type="button" class="btn-secondary" data-quick="${q}" ${state.regenerating ? "disabled" : ""}>${q}</button>`).join("")}
            </div>
            <div class="regen-custom">
              <input type="text" id="regen-instruction" placeholder="Ou escreva sua própria instrução" value="${state.regenInstruction}" />
              <button type="button" id="regen-custom-btn" ${state.regenerating ? "disabled" : ""}>${state.regenerating ? "Regenerando..." : "Regenerar"}</button>
            </div>
            ${state.regenWarnings?.length ? `<ul class="warnings-list">${state.regenWarnings.map((w) => `<li class="warning-item severity-low">${w}</li>`).join("")}</ul>` : ""}
          </div>

          ${renderHistory()}
        </div>

        ${renderChecklist()}
      </div>
    `;
  }

  function render() {
    if (state.loading) {
      app.innerHTML = `<div class="profile-screen"><p class="auth-subtitle">Carregando...</p></div>`;
      return;
    }

    if (!state.pkg) {
      app.innerHTML = renderGenerateForm();
      wireGenerateForm();
      return;
    }

    app.innerHTML = renderEditor();
    wireEditor();
  }

  function wireGenerateForm() {
    document.querySelector("#back-btn").addEventListener("click", onBack);
    document.querySelectorAll("[data-gen-type]").forEach((el) => {
      el.addEventListener("change", () => {
        if (el.checked) state.genAssetTypes.add(el.dataset.genType);
        else state.genAssetTypes.delete(el.dataset.genType);
      });
    });
    document.querySelector("#gen-instruction").addEventListener("input", (e) => { state.genInstruction = e.target.value; });
    document.querySelector("#generate-btn").addEventListener("click", doGenerate);
  }

  function wireEditor() {
    document.querySelector("#back-btn").addEventListener("click", onBack);
    document.querySelector("#regenerate-package-btn").addEventListener("click", () => {
      state.pkg = null;
      state.lastIdempotencyKey = null;
      render();
    });

    document.querySelectorAll(".asset-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeType = btn.dataset.type;
        syncDraft();
        render();
      });
    });

    document.querySelector("#asset-content").addEventListener("input", (e) => {
      state.draftContent = e.target.value;
      state.dirty = true;
      document.querySelector("#save-btn").disabled = false;
    });

    document.querySelector("#copy-btn").addEventListener("click", copyActive);
    document.querySelector("#save-btn").addEventListener("click", saveEdit);
    document.querySelector("#history-btn").addEventListener("click", toggleHistory);

    document.querySelectorAll("[data-quick]").forEach((btn) => {
      btn.addEventListener("click", () => doRegenerate(btn.dataset.quick));
    });
    document.querySelector("#regen-instruction").addEventListener("input", (e) => { state.regenInstruction = e.target.value; });
    document.querySelector("#regen-custom-btn").addEventListener("click", () => {
      if (state.regenInstruction.trim()) doRegenerate(state.regenInstruction.trim());
    });

    document.querySelectorAll("[data-restore]").forEach((btn) => {
      btn.addEventListener("click", () => doRestore(btn.dataset.restore));
    });

    document.querySelectorAll("[data-checklist-idx]").forEach((el) => {
      el.addEventListener("change", () => toggleChecklistItem(el.dataset.checklistIdx, el.checked));
    });
  }

  await load();
}
