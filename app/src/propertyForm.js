import { createProperty, updateProperty, quickFillProperty, uploadPropertyMedia, deletePropertyMedia } from "./api.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STEPS = ["Básicas", "Ambientes", "Localização", "Diferenciais", "Revisão"];

const TIPOS = ["apartamento", "casa", "terreno", "comercial", "rural"];
const FINALIDADES = ["residencial", "comercial", "misto"];
const OPERACOES = ["venda", "aluguel"];

function toNum(v) {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}
function toInt(v) {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}
function toList(v) {
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function renderPropertyFormScreen(existing, onDone, onCancel) {
  const app = document.querySelector("#app");
  const isEdit = !!existing;

  const state = {
    step: 0,
    saving: false,
    error: "",
    quickFill: { open: !isEdit, texto: "", loading: false, message: "" },
    media: existing?.media || [],
    mediaUploading: false,
    mediaError: "",
    f: {
      titulo_interno: existing?.titulo_interno || "",
      tipo: existing?.tipo || "",
      finalidade: existing?.finalidade || "",
      operacao: existing?.operacao || "",
      preco: existing?.preco ?? "",
      condominio: existing?.condominio ?? "",
      iptu: existing?.iptu ?? "",
      valor_minimo_negociacao: existing?.valor_minimo_negociacao ?? "",
      area_total: existing?.area_total ?? "",
      area_privativa: existing?.area_privativa ?? "",
      dormitorios: existing?.dormitorios ?? "",
      suites: existing?.suites ?? "",
      banheiros: existing?.banheiros ?? "",
      vagas: existing?.vagas ?? "",
      andar: existing?.andar || "",
      mobiliado: existing?.mobiliado ?? false,
      cidade: existing?.cidade || "",
      bairro: existing?.bairro || "",
      endereco_publico: existing?.endereco_publico || "",
      caracteristicas: (existing?.caracteristicas || []).join(", "),
      diferenciais: (existing?.diferenciais || []).join(", "),
      estado_conservacao: existing?.estado_conservacao || "",
      descricao_entorno: existing?.descricao_entorno || "",
      regras: existing?.regras || "",
      observacoes: existing?.observacoes || "",
    },
  };

  function buildPayload() {
    const f = state.f;
    return {
      titulo_interno: f.titulo_interno.trim(),
      tipo: f.tipo,
      finalidade: f.finalidade,
      operacao: f.operacao,
      preco: toNum(f.preco),
      condominio: toNum(f.condominio),
      iptu: toNum(f.iptu),
      valor_minimo_negociacao: toNum(f.valor_minimo_negociacao),
      area_total: toNum(f.area_total),
      area_privativa: toNum(f.area_privativa),
      dormitorios: toInt(f.dormitorios),
      suites: toInt(f.suites),
      banheiros: toInt(f.banheiros),
      vagas: toInt(f.vagas),
      andar: f.andar,
      mobiliado: !!f.mobiliado,
      cidade: f.cidade.trim(),
      bairro: f.bairro.trim(),
      endereco_publico: f.endereco_publico.trim(),
      caracteristicas: toList(f.caracteristicas),
      diferenciais: toList(f.diferenciais),
      estado_conservacao: f.estado_conservacao,
      descricao_entorno: f.descricao_entorno.trim(),
      regras: f.regras.trim(),
      observacoes: f.observacoes.trim(),
    };
  }

  async function save({ asDraftOnly } = {}) {
    state.saving = true;
    state.error = "";
    render();
    try {
      const payload = buildPayload();
      if (isEdit) await updateProperty(existing.id, payload);
      else await createProperty(payload);
      onDone();
    } catch (err) {
      state.error = err.message;
      state.saving = false;
      render();
    }
  }

  function stepFieldsHtml() {
    const f = state.f;
    switch (state.step) {
      case 0:
        return `
          ${state.quickFill.open ? `
            <div class="warnings-panel quick-fill">
              <p class="warnings-title">Atalho</p>
              <label>Descreva o imóvel em uma frase — a gente organiza os campos abaixo pra você revisar
                <textarea id="quick-fill-text" rows="2" placeholder="Ex: Apto 2 quartos reformado na Vila Madalena, 65m², vaga, R$ 480 mil">${state.quickFill.texto}</textarea>
              </label>
              <div class="quick-fill-actions">
                <button type="button" id="quick-fill-run" class="btn-secondary" ${state.quickFill.loading ? "disabled" : ""}>${state.quickFill.loading ? "Organizando..." : "Organizar campos"}</button>
                <button type="button" id="quick-fill-hide" class="link-btn">ocultar atalho</button>
              </div>
              ${state.quickFill.message ? `<p class="auth-error ${state.quickFill.messageType === "error" ? "" : "auth-info"}">${state.quickFill.message}</p>` : ""}
            </div>
          ` : ""}
          <label>Título interno (só pra você identificar)
            <input type="text" data-f="titulo_interno" value="${f.titulo_interno}" placeholder="Apto Vila Madalena 2Q reformado" required />
          </label>
          <div class="profile-row">
            <label>Tipo
              <select data-f="tipo">
                <option value="">Selecione</option>
                ${TIPOS.map((t) => `<option value="${t}" ${f.tipo === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
            <label>Finalidade
              <select data-f="finalidade">
                <option value="">Selecione</option>
                ${FINALIDADES.map((t) => `<option value="${t}" ${f.finalidade === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="profile-row">
            <label>Operação
              <select data-f="operacao">
                <option value="">Selecione</option>
                ${OPERACOES.map((t) => `<option value="${t}" ${f.operacao === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
            <label>Preço (R$)
              <input type="number" min="0" data-f="preco" value="${f.preco}" />
            </label>
          </div>
          <div class="profile-row">
            <label>Condomínio (R$)
              <input type="number" min="0" data-f="condominio" value="${f.condominio}" />
            </label>
            <label>IPTU (R$)
              <input type="number" min="0" data-f="iptu" value="${f.iptu}" />
            </label>
          </div>
          <label>Valor mínimo aceito pelo proprietário (R$) — opcional
            <input type="number" min="0" data-f="valor_minimo_negociacao" value="${f.valor_minimo_negociacao}" />
          </label>
          <p class="field-hint">Uso interno seu, só pra negociação — nunca aparece nos materiais gerados nem em nenhum lugar público.</p>

          ${isEdit ? `
            <div class="foto-section">
              <p class="warnings-title">Fotos</p>
              <div class="foto-capa" ${state.media[0] ? `style="background: url('${state.media[0].url}') center/cover no-repeat;"` : ""}>
                ${state.media[0] ? "" : `<span class="foto-capa-label serif">Foto de capa</span>`}
              </div>
              <div class="foto-rail">
                <label class="foto-frame foto-frame-add ${state.mediaUploading ? "foto-frame-loading" : ""}">
                  ${state.mediaUploading ? "…" : "+"}
                  <input type="file" id="foto-input" accept="image/png,image/jpeg,image/webp" hidden ${state.mediaUploading ? "disabled" : ""} />
                </label>
                ${state.media.map((m) => `
                  <div class="foto-frame">
                    <img src="${m.url}" alt="" />
                    <button type="button" class="foto-remove" data-media-id="${m.id}" aria-label="Excluir foto">×</button>
                  </div>
                `).join("")}
              </div>
              ${state.mediaError ? `<p class="auth-error">${state.mediaError}</p>` : ""}
            </div>
          ` : `<p class="field-hint">Salve o imóvel (rascunho ou completo) pra poder adicionar fotos.</p>`}
        `;
      case 1:
        return `
          <div class="profile-row">
            <label>Área total (m²)
              <input type="number" min="0" data-f="area_total" value="${f.area_total}" />
            </label>
            <label>Área privativa (m²)
              <input type="number" min="0" data-f="area_privativa" value="${f.area_privativa}" />
            </label>
          </div>
          <div class="profile-row">
            <label>Dormitórios
              <input type="number" min="0" step="1" data-f="dormitorios" value="${f.dormitorios}" />
            </label>
            <label>Suítes
              <input type="number" min="0" step="1" data-f="suites" value="${f.suites}" />
            </label>
          </div>
          <div class="profile-row">
            <label>Banheiros
              <input type="number" min="0" step="1" data-f="banheiros" value="${f.banheiros}" />
            </label>
            <label>Vagas
              <input type="number" min="0" step="1" data-f="vagas" value="${f.vagas}" />
            </label>
          </div>
          <div class="profile-row">
            <label>Andar
              <input type="text" data-f="andar" value="${f.andar}" placeholder="5º andar" />
            </label>
            <label class="checkbox-label">
              <input type="checkbox" data-f="mobiliado" ${f.mobiliado ? "checked" : ""} /> Mobiliado
            </label>
          </div>
        `;
      case 2:
        return `
          <div class="profile-row">
            <label>Cidade
              <input type="text" data-f="cidade" value="${f.cidade}" />
            </label>
            <label>Bairro
              <input type="text" data-f="bairro" value="${f.bairro}" />
            </label>
          </div>
          <label>Endereço público (opcional, aparece no anúncio)
            <input type="text" data-f="endereco_publico" value="${f.endereco_publico}" />
          </label>
        `;
      case 3:
        return `
          <label>Características (separe por vírgula)
            <input type="text" data-f="caracteristicas" value="${f.caracteristicas}" placeholder="varanda, academia no prédio, portaria 24h" />
          </label>
          <label>Diferenciais (separe por vírgula)
            <input type="text" data-f="diferenciais" value="${f.diferenciais}" placeholder="reformado em 2025, vista livre" />
          </label>
          <label>Estado de conservação
            <input type="text" data-f="estado_conservacao" value="${f.estado_conservacao}" placeholder="reformado, novo, usado" />
          </label>
          <label>Descrição do entorno
            <textarea data-f="descricao_entorno" rows="2">${f.descricao_entorno}</textarea>
          </label>
          <label>Regras do imóvel
            <input type="text" data-f="regras" value="${f.regras}" />
          </label>
          <label>Observações
            <textarea data-f="observacoes" rows="2">${f.observacoes}</textarea>
          </label>
        `;
      case 4: {
        const p = buildPayload();
        return `
          <p class="auth-subtitle">Confira antes de salvar — dá pra editar depois.</p>
          <ul class="review-list">
            <li><strong>${p.titulo_interno || "(sem título)"}</strong></li>
            <li>${p.tipo || "—"} · ${p.finalidade || "—"} · ${p.operacao || "—"}</li>
            <li>R$ ${p.preco ?? "—"} ${p.condominio ? `+ cond. R$ ${p.condominio}` : ""}</li>
            <li>${p.area_privativa ?? "—"}m² · ${p.dormitorios ?? "—"} dorm · ${p.suites ?? "—"} suítes · ${p.vagas ?? "—"} vagas</li>
            <li>${p.bairro || "—"}, ${p.cidade || "—"}</li>
            ${p.valor_minimo_negociacao ? `<li>Mínimo interno: R$ ${p.valor_minimo_negociacao} <span class="field-hint" style="margin:0;display:inline;">(não aparece nos materiais)</span></li>` : ""}
          </ul>
        `;
      }
      default:
        return "";
    }
  }

  function render() {
    const canGoNext = state.step < STEPS.length - 1;
    const canGoBack = state.step > 0;

    app.innerHTML = `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="cancel-btn">Cancelar</button>
      </header>
      <div class="dashboard" style="max-width: 640px;">
        <h1 class="auth-title">${isEdit ? "Editar imóvel" : "Novo imóvel"}</h1>
        <div class="step-indicator">
          ${STEPS.map((s, i) => `
            <div class="step ${i === state.step ? "step-active" : i < state.step ? "step-done" : ""}">
              <div class="num">${i < state.step ? "✓" : i + 1}</div>
              <span class="step-label">${s}</span>
            </div>
            ${i < STEPS.length - 1 ? '<div class="connector"></div>' : ""}
          `).join("")}
        </div>

        <form id="property-form" class="profile-form">${stepFieldsHtml()}</form>

        ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

        <div class="profile-actions" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); justify-content: flex-end;">
          ${canGoBack ? `<button type="button" id="back-btn" class="btn-secondary">Voltar</button>` : ""}
          <button type="button" id="draft-btn" class="btn-secondary" ${state.saving ? "disabled" : ""}>Salvar rascunho</button>
          ${canGoNext
            ? `<button type="button" id="next-btn">Próximo</button>`
            : `<button type="button" id="submit-btn" ${state.saving ? "disabled" : ""}>${state.saving ? "Salvando..." : isEdit ? "Salvar" : "Criar imóvel"}</button>`}
        </div>
      </div>
    `;

    document.querySelectorAll("[data-f]").forEach((el) => {
      const field = el.dataset.f;
      const evt = el.type === "checkbox" ? "change" : "input";
      el.addEventListener(evt, () => {
        state.f[field] = el.type === "checkbox" ? el.checked : el.value;
      });
    });

    if (state.step === 0 && state.quickFill.open) {
      document.querySelector("#quick-fill-text").addEventListener("input", (e) => {
        state.quickFill.texto = e.target.value;
      });
      document.querySelector("#quick-fill-hide").addEventListener("click", () => {
        state.quickFill.open = false;
        render();
      });
      document.querySelector("#quick-fill-run").addEventListener("click", async () => {
        const texto = state.quickFill.texto.trim();
        if (!texto) return;
        state.quickFill.loading = true;
        state.quickFill.message = "";
        render();
        try {
          const { fields } = await quickFillProperty(texto);
          const applied = [];
          for (const [key, value] of Object.entries(fields || {})) {
            if (!(key in state.f) || value === undefined || value === null) continue;
            state.f[key] = Array.isArray(value) ? value.join(", ") : value;
            applied.push(key);
          }
          state.quickFill.message = applied.length
            ? "Campos organizados — confira antes de continuar."
            : "Não consegui identificar campos nesse texto. Preencha manualmente abaixo.";
          state.quickFill.messageType = "success";
        } catch (err) {
          state.quickFill.message = err.message;
          state.quickFill.messageType = "error";
        }
        state.quickFill.loading = false;
        render();
      });
    }

    if (state.step === 0 && isEdit) {
      document.querySelector("#foto-input").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          state.mediaError = "Foto maior que 5MB.";
          render();
          return;
        }
        state.mediaUploading = true;
        state.mediaError = "";
        render();
        try {
          const base64 = await fileToBase64(file);
          const media = await uploadPropertyMedia(existing.id, base64, file.type);
          state.media.push(media);
        } catch (err) {
          state.mediaError = `Erro ao enviar foto: ${err.message}`;
        }
        state.mediaUploading = false;
        render();
      });
      document.querySelectorAll(".foto-remove").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const mediaId = btn.dataset.mediaId;
          try {
            await deletePropertyMedia(mediaId);
            state.media = state.media.filter((m) => m.id !== mediaId);
            render();
          } catch (err) {
            state.mediaError = `Erro ao excluir foto: ${err.message}`;
            render();
          }
        });
      });
    }

    document.querySelector("#cancel-btn").addEventListener("click", onCancel);
    if (canGoBack) {
      document.querySelector("#back-btn").addEventListener("click", () => {
        state.step -= 1;
        render();
      });
    }
    document.querySelector("#draft-btn").addEventListener("click", () => save({ asDraftOnly: true }));
    if (canGoNext) {
      document.querySelector("#next-btn").addEventListener("click", () => {
        if (state.step === 0 && !state.f.titulo_interno.trim()) {
          state.error = "Título interno é obrigatório.";
          render();
          return;
        }
        state.error = "";
        state.step += 1;
        render();
      });
    } else {
      document.querySelector("#submit-btn").addEventListener("click", () => save({}));
    }
  }

  render();
}
