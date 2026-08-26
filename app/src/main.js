import { supabase } from "./supabaseClient.js";
import { renderAuthScreen } from "./auth.js";
import { renderProfileScreen } from "./profile.js";
import { renderDashboardScreen } from "./dashboard.js";
import { renderShareScreen } from "./shareView.js";
import { getProfile } from "./api.js";

async function route() {
  // Página pública de compartilhamento (Sprint 5) — sem autenticação,
  // o token da URL é a própria autorização. Precisa vir antes de
  // qualquer checagem de sessão Supabase.
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/);
  if (shareMatch) {
    renderShareScreen(shareMatch[1]);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderAuthScreen(route);
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

  renderDashboardScreen();
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") route();
});

route();
