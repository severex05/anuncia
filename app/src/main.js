import { supabase } from "./supabaseClient.js";
import { renderAuthScreen, setAuthMode } from "./auth.js";
import { renderProfileScreen } from "./profile.js";
import { renderDashboardScreen } from "./dashboard.js";
import { renderBillingScreen } from "./billing.js";
import { renderDevelopmentsScreen } from "./developments.js";
import { renderShareScreen } from "./shareView.js";
import { renderLandingScreen } from "./landing.js";
import { renderTermsScreen, renderPrivacyScreen } from "./legal.js";
import { renderExamplesScreen } from "./examples.js";
import { getProfile } from "./api.js";

function goToAuth(mode) {
  setAuthMode(mode);
  window.history.pushState({}, "", mode === "signup" ? "/cadastro" : "/entrar");
  renderAuthScreen(route);
}

function goBack() {
  window.history.pushState({}, "", "/");
  route();
}

async function route() {
  // Página pública de compartilhamento (Sprint 5) — sem autenticação,
  // o token da URL é a própria autorização. Precisa vir antes de
  // qualquer checagem de sessão Supabase.
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/);
  if (shareMatch) {
    renderShareScreen(shareMatch[1]);
    return;
  }

  // Termos/Privacidade (Sprint 7) — públicas, com ou sem sessão.
  const path0 = window.location.pathname;
  if (path0 === "/termos") {
    renderTermsScreen(goBack);
    return;
  }
  if (path0 === "/privacidade") {
    renderPrivacyScreen(goBack);
    return;
  }
  if (path0 === "/exemplos") {
    renderExamplesScreen(goBack, goToAuth);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const path = window.location.pathname;
    if (path === "/entrar") {
      setAuthMode("login");
      renderAuthScreen(route);
    } else if (path === "/cadastro") {
      setAuthMode("signup");
      renderAuthScreen(route);
    } else {
      renderLandingScreen(goToAuth);
    }
    return;
  }

  let profile;
  try {
    profile = await getProfile();
  } catch (_) {
    profile = null;
  }

  if (!profile?.onboarding_completo) {
    renderProfileScreen(route);
    return;
  }

  if (window.location.pathname === "/plano") {
    renderBillingScreen(goBack);
    return;
  }

  if (window.location.pathname === "/empreendimentos") {
    renderDevelopmentsScreen(goBack);
    return;
  }

  renderDashboardScreen();
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") route();
});

window.addEventListener("popstate", route);

route();
