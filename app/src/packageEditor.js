import {
  generatePackage, listPackages, getPackage, updateChecklist,
  updateAsset, regenerateAsset, getAssetVersions, restoreAssetVersion,
  exportPackage, createShareLink, revokeShareLink, getSubscription, getProfile,
} from "./api.js";
import { renderVisualPiece, downloadCanvas } from "./visualPiece.js";
import { generateReelVideo, downloadVideoBlob } from "./reelVideo.js";

const PLAN_LABELS = { trial: "Teste grátis", solo: "Solo", pro: "Pro", equipe: "Equipe" };

function quotaLabel(quota) {
  if (!quota) return "";
  const planoLabel = PLAN_LABELS[quota.plano] || quota.plano;
  if (quota.limite === null) return `Plano ${planoLabel} — uso ilimitado`;
  const cicloLabel = quota.ciclo === "mensal" ? "este mês" : "no total";
  return `Plano ${planoLabel} — ${quota.usado}/${quota.limite} lançamentos ${cicloLabel}`;
}

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
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
    exporting: false,
    sharing: false,
    shareCopyLabel: "Copiar link",
    quota: null,
    profile: null,
    reelVideoGenerating: false,
    reelVideoError: "",
    reelVideoResult: null,
  };

  async function loadQuota() {
    try {
      state.quota = await getSubscription();
    } catch {
      state.quota = null; // não bloqueia a tela por causa disso
    }
  }

  async function loadProfile() {
    try {
      state.profile = await getProfile();
    } catch {
      state.profile = null; // peça visual funciona sem rodapé de corretor
    }
  }

  async function load() {
    state.loading = true;
    render();
    try {
      await loadQuota();
      await loadProfile();
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
      await loadQuota();
    } catch (err) {
      if (err.status === 402) {
        if (err.data?.quota) state.quota = { ...state.quota, ...err.data.quota, permite_gerar: false };
        state.error = err.data?.quota?.plano === "trial"
          ? 'Você já usou seu pacote grátis. <a href="/plano">Assine um plano</a> pra continuar lançando.'
          : 'Limite de lançamentos do seu plano atingido este mês. <a href="/plano">Veja os planos</a> pra liberar mais.';
      } else {
        state.error = err.message;
      }
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
      state.history = null;
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
      state.history = null;
      if (state.showHistory) {
        try {
          state.history = await getAssetVersions(asset.id);
        } catch (err) {
          state.error = err.message;
        }
      }
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

  async function doExport(format) {
    state.exporting = true;
    state.error = "";
    render();
    try {
      await exportPackage(state.pkg.id, format);
    } catch (err) {
      state.error = err.message;
    }
    state.exporting = false;
    render();
  }

  async function doShare() {
    state.sharing = true;
    state.error = "";
    render();
    try {
      const { share_token, share_enabled } = await createShareLink(state.pkg.id);
      state.pkg.share_token = share_token;
      state.pkg.share_enabled = share_enabled;
    } catch (err) {
      state.error = err.message;
    }
    state.sharing = false;
    render();
  }

  async function doRevokeShare() {
    if (!confirm("Revogar o link? Quem tiver o link atual perde o acesso.")) return;
    state.sharing = true;
    state.error = "";
    render();
    try {
      await revokeShareLink(state.pkg.id);
      state.pkg.share_enabled = false;
      state.pkg.share_token = null;
    } catch (err) {
      state.error = err.message;
    }
    state.sharing = false;
    render();
  }

  // Não chamar render() durante a gravação: destruiria o <canvas> que o
  // MediaRecorder está capturando no meio do processo. Progresso é
  // atualizado direto no DOM (mesmo cuidado já usado no input de #asset-content).
  async function doGenerateReelVideo() {
    const asset = state.pkg.assets.find((a) => a.tipo === "reel_script");
    state.reelVideoGenerating = true;
    state.reelVideoError = "";
    state.reelVideoResult = null;
    render();
    const canvas = document.querySelector("#reel-video-canvas");
    const label = document.querySelector("#reel-video-progress-label");
    try {
      const result = await generateReelVideo(canvas, {
        property,
        profile: state.profile,
        scriptText: asset?.conteudo || "",
        onStatus: (s) => { if (label) label.textContent = s; },
        onProgress: (p) => { if (label) label.textContent = `Gravando vídeo... ${Math.round(p * 100)}%`; },
      });
      state.reelVideoResult = { blob: result.blob, url: URL.createObjectURL(result.blob) };
    } catch (err) {
      state.reelVideoError = err.message || "Não foi possível gerar o vídeo agora.";
    }
    state.reelVideoGenerating = false;
    render();
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/${state.pkg.share_token}`;
    navigator.clipboard?.writeText(url).then(() => {
      state.shareCopyLabel = "Copiado!";
      render();
      setTimeout(() => { state.shareCopyLabel = "Copiar link"; render(); }, 1500);
    });
  }

  function copyActive() {
    navigator.clipboard?.writeText(state.draftContent).then(() => {
      const btn = document.querySelector("#copy-btn");
      if (btn) { const old = btn.textContent; btn.textContent = "Copiado!"; setTimeout(() => { btn.textContent = old; }, 1500); }
    });
  }

  function renderGenerateForm() {
    return `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="back-btn">Voltar</button>
      </header>
      <div class="profile-screen">
        <div class="profile-card">
          <h1 class="auth-title">Gerar pacote de lançamento</h1>
          <p class="auth-subtitle">Usamos os dados já cadastrados do imóvel e o seu perfil de voz. O resultado é sempre um rascunho — revise antes de publicar.</p>

          ${state.quota ? `<p class="field-hint">${quotaLabel(state.quota)}</p>` : ""}

          <div class="checklist-list gen-types">
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
            <button type="button" id="generate-btn" ${state.generating || state.quota?.permite_gerar === false ? "disabled" : ""}>
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

  const POST_PREVIEW_TYPES = ["instagram", "facebook", "whatsapp"];

  function renderPostPreview() {
    if (!POST_PREVIEW_TYPES.includes(state.activeType)) return "";
    const capa = property.media?.[0];
    return `
      <div class="post-preview">
        <p class="warnings-title">Pronto pra postar</p>
        ${capa
          ? `
            <div class="post-preview-card">
              <div class="post-preview-photo" style="background: url('${capa.url}') center/cover no-repeat;"></div>
              <p class="post-preview-text">${escapeHtml(state.draftContent)}</p>
            </div>
          `
          : `<p class="field-hint">Adicione uma foto de capa no imóvel (aba Básicas, editar imóvel) pra ver a prévia com imagem.</p>`}
      </div>
    `;
  }

  function renderVisualPieceSection() {
    if (!POST_PREVIEW_TYPES.includes(state.activeType)) return "";
    if (!property.media?.length) return "";
    return `
      <div class="visual-piece">
        <p class="warnings-title">Peça visual pronta pra postar</p>
        <canvas id="visual-piece-canvas" class="visual-piece-canvas"></canvas>
        <div class="visual-piece-actions">
          <button type="button" id="visual-piece-download-btn" class="btn-secondary" disabled>Baixar imagem</button>
        </div>
      </div>
    `;
  }

  function renderReelVideoSection() {
    if (state.activeType !== "reel_script") return "";
    if (!property.media?.length) {
      return `
        <div class="visual-piece">
          <p class="warnings-title">Vídeo a partir do roteiro</p>
          <p class="field-hint">Adicione uma foto no imóvel (aba Básicas, editar imóvel) pra gerar o vídeo.</p>
        </div>
      `;
    }
    const showVideo = state.reelVideoResult && !state.reelVideoGenerating;
    return `
      <div class="visual-piece">
        <p class="warnings-title">Vídeo a partir do roteiro</p>
        <p class="auth-subtitle">Monta um vídeo vertical com as fotos do imóvel e este roteiro, com narração por voz quando disponível.</p>
        ${showVideo ? `<video class="reel-video-preview" src="${state.reelVideoResult.url}" controls playsinline></video>` : `<canvas id="reel-video-canvas" class="reel-video-canvas"></canvas>`}
        <p id="reel-video-progress-label" class="field-hint">${state.reelVideoGenerating ? "Preparando..." : ""}</p>
        ${state.reelVideoError ? `<p class="auth-error">${escapeHtml(state.reelVideoError)}</p>` : ""}
        <div class="visual-piece-actions">
          <button type="button" id="reel-video-generate-btn" class="btn-secondary" ${state.reelVideoGenerating ? "disabled" : ""}>${state.reelVideoGenerating ? "Gerando..." : state.reelVideoResult ? "Gerar novamente" : "Gerar vídeo"}</button>
          ${showVideo ? `<button type="button" id="reel-video-download-btn" class="btn-secondary">Baixar vídeo</button>` : ""}
        </div>
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

  function renderShare() {
    const shareUrl = state.pkg.share_token ? `${window.location.origin}/share/${state.pkg.share_token}` : "";
    return `
      <div class="checklist-panel">
        <p class="warnings-title">Compartilhar página privada</p>
        ${state.pkg.share_enabled
          ? `
            <p class="auth-subtitle">Qualquer pessoa com este link vê o pacote, sem precisar de conta.</p>
            <div class="regen-custom">
              <input type="text" readonly value="${shareUrl}" />
              <button type="button" id="copy-share-btn" class="btn-secondary">${state.shareCopyLabel}</button>
              <button type="button" id="revoke-share-btn" class="btn-danger-link" ${state.sharing ? "disabled" : ""}>Revogar</button>
            </div>
          `
          : `<button type="button" id="create-share-btn" class="btn-secondary" ${state.sharing ? "disabled" : ""}>${state.sharing ? "Gerando..." : "Gerar link para compartilhar"}</button>`}
      </div>
    `;
  }

  function renderEditor() {
    const asset = state.pkg.assets.find((a) => a.tipo === state.activeType);
    return `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="back-btn">Voltar</button>
      </header>
      <div class="dashboard package-editor">
        <header class="dashboard-header">
          <h1 class="auth-title">${property.titulo_interno}</h1>
          <div>
            <button type="button" id="export-md-btn" class="btn-secondary" ${state.exporting ? "disabled" : ""}>Exportar .md</button>
            <button type="button" id="export-txt-btn" class="btn-secondary" ${state.exporting ? "disabled" : ""}>Exportar .txt</button>
            <button type="button" id="regenerate-package-btn" class="btn-secondary">Gerar novo pacote</button>
          </div>
        </header>

        <p class="auth-subtitle disclaimer">Este é sempre um rascunho de trabalho. Revise fatos, preço, disponibilidade e fotos antes de publicar.</p>

        ${renderWarnings()}
        ${renderShare()}

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

          ${renderPostPreview()}
          ${renderVisualPieceSection()}
          ${renderReelVideoSection()}

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
    document.querySelector("#export-md-btn").addEventListener("click", () => doExport("md"));
    document.querySelector("#export-txt-btn").addEventListener("click", () => doExport("txt"));

    const createShareBtn = document.querySelector("#create-share-btn");
    if (createShareBtn) createShareBtn.addEventListener("click", doShare);
    const copyShareBtn = document.querySelector("#copy-share-btn");
    if (copyShareBtn) copyShareBtn.addEventListener("click", copyShareLink);
    const revokeShareBtn = document.querySelector("#revoke-share-btn");
    if (revokeShareBtn) revokeShareBtn.addEventListener("click", doRevokeShare);

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
      // Atualiza só o texto da prévia (sem render() completo) pra não perder
      // o cursor/foco do usuário no meio da digitação.
      const previewText = document.querySelector(".post-preview-text");
      if (previewText) previewText.textContent = state.draftContent;
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

    const visualCanvas = document.querySelector("#visual-piece-canvas");
    if (visualCanvas) {
      const downloadBtn = document.querySelector("#visual-piece-download-btn");
      renderVisualPiece(visualCanvas, { property, profile: state.profile })
        .then(() => { downloadBtn.disabled = false; })
        .catch((err) => {
          console.error("[visual-piece]", err.message);
          const p = document.createElement("p");
          p.className = "auth-error";
          p.textContent = "Não foi possível gerar a peça visual agora.";
          visualCanvas.insertAdjacentElement("afterend", p);
        });
      downloadBtn.addEventListener("click", () => {
        const filename = `anuncia-${(property.titulo_interno || "imovel").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
        downloadCanvas(visualCanvas, filename);
      });
    }

    const reelVideoBtn = document.querySelector("#reel-video-generate-btn");
    if (reelVideoBtn) reelVideoBtn.addEventListener("click", doGenerateReelVideo);
    const reelVideoDownloadBtn = document.querySelector("#reel-video-download-btn");
    if (reelVideoDownloadBtn) {
      reelVideoDownloadBtn.addEventListener("click", () => {
        const filename = `anuncia-${(property.titulo_interno || "imovel").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-video.webm`;
        downloadVideoBlob(state.reelVideoResult.blob, filename);
      });
    }
  }

  await load();
}
