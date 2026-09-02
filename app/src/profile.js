import { getProfile, updateProfile, uploadLogo, uploadHeadshot, deleteAccount, setPublicPage } from "./api.js";
import { supabase } from "./supabaseClient.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// mode "onboarding" (padrão, fluxo de cadastro — tela linear, com "Pular
// por agora") ou "edit" (rota /perfil, acessível a qualquer momento depois
// do onboarding — sem skip, com botão Voltar e a seção de página pública).
export async function renderProfileScreen(onSaved, { mode = "onboarding" } = {}) {
  const isEdit = mode === "edit";
  const app = document.querySelector("#app");
  app.innerHTML = `<div class="profile-screen"><p>Carregando perfil...</p></div>`;

  let profile;
  try {
    profile = await getProfile();
  } catch (err) {
    app.innerHTML = `<div class="profile-screen"><p class="auth-error">Erro ao carregar perfil: ${err.message}</p></div>`;
    return;
  }

  const contatos = profile.contatos || {};
  const redes = profile.redes_sociais || {};
  const pageState = {
    ativa: !!profile.pagina_publica_ativa,
    slug: profile.slug || null,
    saving: false,
    copyLabel: "Copiar link",
    error: "",
  };

  app.innerHTML = `
    ${isEdit ? `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="profile-back-btn">Voltar</button>
      </header>
    ` : ""}
    <div class="split-screen">
      <div class="split-hero">
        <span class="wordmark serif">Anuncia</span>
        <div class="claim">
          <h1>A <em>sua</em> voz, em todo lançamento.</h1>
          <p>Nome, CRECI, tom de voz e palavras que você prefere — usados em cada texto gerado, sem você precisar escrever prompt nenhum.</p>
        </div>
        <div></div>
      </div>
      <div class="split-form">
      <div class="profile-screen">
      <div class="profile-card">
        <h1 class="auth-title">${isEdit ? "Editar perfil" : "Complete seu perfil"}</h1>
        <p class="auth-subtitle">${isEdit ? "Atualize seus dados, sua bio e sua página pública." : "Usado pra gerar conteúdo com a sua voz — pode ajustar depois."}</p>

        <form id="profile-form" class="profile-form">
          <div class="profile-logo-row">
            <img id="logo-preview" class="profile-logo-preview" src="${profile.logo_url || ""}" ${profile.logo_url ? "" : "hidden"} />
            <label class="profile-logo-upload">
              Escolher logo (opcional, até 2MB)
              <input type="file" id="logo-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
            </label>
          </div>

          <div class="profile-logo-row">
            <img id="headshot-preview" class="profile-logo-preview profile-headshot-preview" src="${profile.foto_perfil_url || ""}" ${profile.foto_perfil_url ? "" : "hidden"} />
            <label class="profile-logo-upload">
              Escolher foto de rosto (opcional, até 2MB)
              <input type="file" id="headshot-input" accept="image/png,image/jpeg,image/webp" hidden />
            </label>
          </div>
          <p class="field-hint">Aparece no seu mini-site público e no encerramento do vídeo de Reel — dá mais confiança pra quem tá vendo o anúncio.</p>

          <label>Nome público
            <input type="text" id="p-nome" value="${profile.nome_publico || ""}" placeholder="Ex: Ana Beatriz Corretora" required />
          </label>

          <div class="profile-row">
            <label>CRECI
              <input type="text" id="p-creci" value="${profile.creci || ""}" placeholder="12345-F" />
            </label>
            <label>Estado
              <input type="text" id="p-estado" value="${profile.estado || ""}" placeholder="SP" maxlength="2" />
            </label>
          </div>

          <div class="profile-row">
            <label>Cidade
              <input type="text" id="p-cidade" value="${profile.cidade || ""}" placeholder="São Paulo" />
            </label>
            <label>Imobiliária
              <input type="text" id="p-imobiliaria" value="${profile.imobiliaria || ""}" placeholder="Independente" />
            </label>
          </div>

          <div class="profile-row">
            <label>WhatsApp
              <input type="text" id="p-whatsapp" value="${contatos.whatsapp || ""}" placeholder="+55 11 90000-0000" />
            </label>
            <label>Instagram
              <input type="text" id="p-instagram" value="${redes.instagram || ""}" placeholder="@seuinstagram" />
            </label>
          </div>

          <div class="profile-row">
            <label>Celular
              <input type="text" id="p-celular" value="${contatos.telefone || ""}" placeholder="+55 11 90000-0000" />
            </label>
            <label>CPF ou CNPJ
              <input type="text" id="p-cpf-cnpj" value="${profile.cpf_cnpj || ""}" placeholder="000.000.000-00" />
            </label>
          </div>
          <p class="field-hint">Celular e CPF/CNPJ são necessários pra emitir cobrança quando você assinar um plano pago — não afetam o uso do plano grátis.</p>

          <label>Tom de voz
            <textarea id="p-tom" rows="2" placeholder="Ex: direto, caloroso, sempre termina com o WhatsApp">${profile.tom_de_voz || ""}</textarea>
          </label>

          <label>Palavras que você gosta de usar (separe por vírgula)
            <input type="text" id="p-preferidas" value="${(profile.palavras_preferidas || []).join(", ")}" placeholder="charmoso, iluminado, pronto pra morar" />
          </label>

          <label>Palavras proibidas (separe por vírgula)
            <input type="text" id="p-proibidas" value="${(profile.palavras_proibidas || []).join(", ")}" placeholder="oportunidade única, garantido" />
          </label>

          <label>Sobre você (aparece na sua página pública)
            <textarea id="p-apresentacao" rows="3" placeholder="Ex: Corretora há 8 anos em Avaré e região, especializada em imóveis residenciais...">${profile.apresentacao || ""}</textarea>
          </label>

          <p id="profile-error" class="auth-error" hidden></p>

          <div class="profile-actions">
            ${isEdit ? "" : `<button type="button" id="profile-skip" class="btn-secondary">Pular por agora</button>`}
            <button type="submit" id="profile-submit">${isEdit ? "Salvar" : "Salvar e continuar"}</button>
          </div>
        </form>

        ${isEdit ? `<div id="public-page-section"></div>` : ""}

        <button type="button" id="profile-delete-account" class="btn-danger-link">Excluir minha conta</button>
      </div>
      </div>
      </div>
    </div>
  `;

  const errorEl = document.querySelector("#profile-error");
  const showError = (msg) => {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  };

  if (isEdit) {
    document.querySelector("#profile-back-btn").addEventListener("click", onSaved);
    renderPublicPageSection();
  }

  function renderPublicPageSection() {
    const section = document.querySelector("#public-page-section");
    const publicUrl = pageState.slug ? `${window.location.origin}/c/${pageState.slug}` : "";
    section.innerHTML = `
      <div class="checklist-panel public-page-panel">
        <p class="warnings-title">Sua página pública</p>
        <p class="auth-subtitle">Um "cartão de visitas" com seu perfil e os imóveis aprovados, pra linkar no bio do Instagram.</p>
        ${pageState.ativa && pageState.slug ? `
          <p class="auth-subtitle" style="margin-bottom: 10px;"><strong style="color: var(--success);">Ativa.</strong> Qualquer pessoa com o link pode ver.</p>
          <div class="regen-custom">
            <input type="text" readonly value="${publicUrl}" />
            <button type="button" id="copy-public-page-btn" class="btn-secondary">${pageState.copyLabel}</button>
            <a href="${publicUrl}" target="_blank" rel="noopener" class="btn-secondary">Ver página</a>
          </div>
          <button type="button" id="toggle-public-page-btn" class="btn-danger-link" ${pageState.saving ? "disabled" : ""}>${pageState.saving ? "Desativando..." : "Desativar página pública"}</button>
        ` : `
          <p class="auth-subtitle" style="margin-bottom: 10px;">Desativada — ninguém vê a página até você ativar.</p>
          <button type="button" id="toggle-public-page-btn" class="btn-secondary" ${pageState.saving ? "disabled" : ""}>${pageState.saving ? "Ativando..." : "Ativar página pública"}</button>
        `}
        ${pageState.error ? `<p class="auth-error">${pageState.error}</p>` : ""}
      </div>
    `;

    document.querySelector("#toggle-public-page-btn").addEventListener("click", async () => {
      pageState.saving = true;
      pageState.error = "";
      renderPublicPageSection();
      try {
        const result = await setPublicPage(!pageState.ativa);
        pageState.ativa = result.pagina_publica_ativa;
        pageState.slug = result.slug;
      } catch (err) {
        pageState.error = `Erro: ${err.message}`;
      } finally {
        pageState.saving = false;
        renderPublicPageSection();
      }
    });

    const copyBtn = document.querySelector("#copy-public-page-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard?.writeText(publicUrl).then(() => {
          pageState.copyLabel = "Copiado!";
          renderPublicPageSection();
          setTimeout(() => { pageState.copyLabel = "Copiar link"; renderPublicPageSection(); }, 1500);
        });
      });
    }
  }

  document.querySelector("#logo-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError("Logo maior que 2MB.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const { logo_url } = await uploadLogo(base64, file.type);
      const preview = document.querySelector("#logo-preview");
      preview.src = logo_url;
      preview.hidden = false;
    } catch (err) {
      showError(`Erro ao enviar logo: ${err.message}`);
    }
  });

  document.querySelector("#headshot-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError("Foto maior que 2MB.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const { foto_perfil_url } = await uploadHeadshot(base64, file.type);
      const preview = document.querySelector("#headshot-preview");
      preview.src = foto_perfil_url;
      preview.hidden = false;
    } catch (err) {
      showError(`Erro ao enviar foto: ${err.message}`);
    }
  });

  function collectFields() {
    return {
      nome_publico: document.querySelector("#p-nome").value.trim(),
      creci: document.querySelector("#p-creci").value.trim(),
      estado: document.querySelector("#p-estado").value.trim().toUpperCase(),
      cidade: document.querySelector("#p-cidade").value.trim(),
      imobiliaria: document.querySelector("#p-imobiliaria").value.trim(),
      contatos: {
        ...contatos,
        whatsapp: document.querySelector("#p-whatsapp").value.trim(),
        telefone: document.querySelector("#p-celular").value.trim(),
      },
      redes_sociais: { ...redes, instagram: document.querySelector("#p-instagram").value.trim() },
      cpf_cnpj: document.querySelector("#p-cpf-cnpj").value.trim(),
      tom_de_voz: document.querySelector("#p-tom").value.trim(),
      palavras_preferidas: document.querySelector("#p-preferidas").value.split(",").map((s) => s.trim()).filter(Boolean),
      palavras_proibidas: document.querySelector("#p-proibidas").value.split(",").map((s) => s.trim()).filter(Boolean),
      apresentacao: document.querySelector("#p-apresentacao").value.trim(),
    };
  }

  document.querySelector("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector("#profile-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? "Salvando..." : "Salvando...";
    try {
      await updateProfile({ ...collectFields(), onboarding_completo: true });
      onSaved();
    } catch (err) {
      showError(`Erro ao salvar: ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? "Salvar" : "Salvar e continuar";
    }
  });

  if (!isEdit) {
    document.querySelector("#profile-skip").addEventListener("click", async () => {
      try {
        await updateProfile({ onboarding_completo: true });
      } catch (_) {
        /* pular mesmo se salvar falhar — não bloquear o usuário */
      }
      onSaved();
    });
  }

  document.querySelector("#profile-delete-account").addEventListener("click", async () => {
    if (!confirm("Tem certeza? Isso apaga sua conta e todos os imóveis cadastrados, sem volta.")) return;
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      showError(`Erro ao excluir conta: ${err.message}`);
    }
  });
}
