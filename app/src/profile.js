import { getProfile, updateProfile, uploadLogo, deleteAccount } from "./api.js";
import { supabase } from "./supabaseClient.js";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderProfileScreen(onSaved) {
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

  app.innerHTML = `
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
        <h1 class="auth-title">Complete seu perfil</h1>
        <p class="auth-subtitle">Usado pra gerar conteúdo com a sua voz — pode ajustar depois.</p>

        <form id="profile-form" class="profile-form">
          <div class="profile-logo-row">
            <img id="logo-preview" class="profile-logo-preview" src="${profile.logo_url || ""}" ${profile.logo_url ? "" : "hidden"} />
            <label class="profile-logo-upload">
              Escolher logo (opcional, até 2MB)
              <input type="file" id="logo-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden />
            </label>
          </div>

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

          <label>Tom de voz
            <textarea id="p-tom" rows="2" placeholder="Ex: direto, caloroso, sempre termina com o WhatsApp">${profile.tom_de_voz || ""}</textarea>
          </label>

          <label>Palavras que você gosta de usar (separe por vírgula)
            <input type="text" id="p-preferidas" value="${(profile.palavras_preferidas || []).join(", ")}" placeholder="charmoso, iluminado, pronto pra morar" />
          </label>

          <label>Palavras proibidas (separe por vírgula)
            <input type="text" id="p-proibidas" value="${(profile.palavras_proibidas || []).join(", ")}" placeholder="oportunidade única, garantido" />
          </label>

          <p id="profile-error" class="auth-error" hidden></p>

          <div class="profile-actions">
            <button type="button" id="profile-skip" class="btn-secondary">Pular por agora</button>
            <button type="submit" id="profile-submit">Salvar e continuar</button>
          </div>
        </form>

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

  function collectFields() {
    return {
      nome_publico: document.querySelector("#p-nome").value.trim(),
      creci: document.querySelector("#p-creci").value.trim(),
      estado: document.querySelector("#p-estado").value.trim().toUpperCase(),
      cidade: document.querySelector("#p-cidade").value.trim(),
      imobiliaria: document.querySelector("#p-imobiliaria").value.trim(),
      contatos: { ...contatos, whatsapp: document.querySelector("#p-whatsapp").value.trim() },
      redes_sociais: { ...redes, instagram: document.querySelector("#p-instagram").value.trim() },
      tom_de_voz: document.querySelector("#p-tom").value.trim(),
      palavras_preferidas: document.querySelector("#p-preferidas").value.split(",").map((s) => s.trim()).filter(Boolean),
      palavras_proibidas: document.querySelector("#p-proibidas").value.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }

  document.querySelector("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.querySelector("#profile-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";
    try {
      await updateProfile({ ...collectFields(), onboarding_completo: true });
      onSaved();
    } catch (err) {
      showError(`Erro ao salvar: ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = "Salvar e continuar";
    }
  });

  document.querySelector("#profile-skip").addEventListener("click", async () => {
    try {
      await updateProfile({ onboarding_completo: false });
    } catch (_) {
      /* pular mesmo se salvar falhar — não bloquear o usuário */
    }
    onSaved();
  });

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
