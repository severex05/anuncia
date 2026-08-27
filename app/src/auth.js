import { supabase } from "./supabaseClient.js";
import { logSignupEvent } from "./api.js";

let mode = "login"; // "login" | "signup"

export function setAuthMode(m) {
  mode = m;
}

function translateAuthError(message) {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("registered")) return "E-mail já cadastrado. Tente entrar.";
  if (m.includes("invalid")) return "E-mail ou senha incorretos.";
  if (m.includes("confirm")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("password") && m.includes("6")) return "Senha precisa ter pelo menos 6 caracteres.";
  return "Algo deu errado. Tente de novo.";
}

export function renderAuthScreen(onAuthenticated) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="split-screen">
      <div class="split-hero">
        <span class="wordmark serif">Anuncia</span>
        <div class="claim">
          <h1>Cadastre uma vez.<br/>Divulgue em <em>todo lugar</em>.</h1>
          <p>Descrição, Instagram, WhatsApp, e-mail e roteiro de Reel — gerados a partir dos dados reais do seu imóvel, na sua voz.</p>
        </div>
        <div class="proof">USADO POR CORRETORES AUTÔNOMOS EM TODO O BRASIL</div>
      </div>
      <div class="split-form">
        <div class="auth-screen">
          <div class="auth-card">
            <h1 class="auth-title">${mode === "login" ? "Bem-vindo de volta" : "Criar conta"}</h1>
            <p class="auth-subtitle">${mode === "login" ? "Entre pra continuar seus lançamentos." : "Leva menos de um minuto."}</p>

            <form id="auth-form" class="auth-form">
              <input type="email" id="auth-email" placeholder="E-mail" required autocomplete="email" />
              <input type="password" id="auth-password" placeholder="Senha" required autocomplete="current-password" minlength="6" />
              <p id="auth-error" class="auth-error" hidden></p>
              <button type="submit" id="auth-submit">${mode === "login" ? "Entrar" : "Criar conta"}</button>
            </form>

            <p class="auth-toggle">
              ${mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}
              <button type="button" id="auth-toggle-btn">${mode === "login" ? "Criar conta" : "Entrar"}</button>
            </p>

            ${mode === "signup" ? `
              <p class="legal-fineprint">Ao criar conta, você concorda com os <a href="/termos">Termos de Uso</a> e a <a href="/privacidade">Política de Privacidade</a>.</p>
            ` : ""}
          </div>
        </div>
      </div>
    </div>
  `;

  document.querySelector("#auth-toggle-btn").addEventListener("click", () => {
    mode = mode === "login" ? "signup" : "login";
    renderAuthScreen(onAuthenticated);
  });

  const form = document.querySelector("#auth-form");
  const errorEl = document.querySelector("#auth-error");
  const submitBtn = document.querySelector("#auth-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Aguarde...";

    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;

    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = translateAuthError(error.message);
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = mode === "login" ? "Entrar" : "Criar conta";
      return;
    }

    if (mode === "signup") {
      errorEl.textContent = "Conta criada! Verifique seu e-mail se pedirmos confirmação, ou já pode continuar.";
      errorEl.hidden = false;
      errorEl.classList.add("auth-info");
      logSignupEvent();
    }

    onAuthenticated();
  });
}
