import { supabase } from "./supabaseClient.js";

// Placeholder até o Sprint 2 (CRUD de imóvel) existir.
export function renderDashboardScreen() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="placeholder">
      <h1>Perfil salvo!</h1>
      <p>O cadastro de imóveis chega no Sprint 2. Por enquanto, seu login e perfil já estão funcionando de ponta a ponta.</p>
      <button type="button" id="logout-btn" class="btn-secondary">Sair</button>
    </div>
  `;
  document.querySelector("#logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
}
