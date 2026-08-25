import { supabase } from "./supabaseClient.js";
import { renderAuthScreen } from "./auth.js";
import { renderProfileScreen } from "./profile.js";
import { renderDashboardScreen } from "./dashboard.js";
import { getProfile } from "./api.js";

async function route() {
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
