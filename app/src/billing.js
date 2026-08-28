import { getSubscription, getProfile, createAsaasCheckout } from "./api.js";

const PLAN_LABELS = { trial: "Teste grátis", solo: "Solo", pro: "Pro", equipe: "Equipe" };

const PLANOS = [
  {
    id: "solo",
    nome: "Solo",
    preco: "R$97",
    resumo: "Até 10 lançamentos por mês",
    itens: ["Tudo do plano grátis", "Histórico de versões", "Regeneração com instrução rápida"],
  },
  {
    id: "pro",
    nome: "Pro",
    preco: "R$147",
    resumo: "Até 25 lançamentos por mês",
    itens: ["Tudo do plano Solo", "Volume pra quem lança toda semana", "Prioridade no suporte"],
  },
];

export async function renderBillingScreen(onBack) {
  const app = document.querySelector("#app");
  const state = {
    loading: true,
    error: "",
    quota: null,
    profile: null,
    checkoutPlano: null, // plano aguardando CPF antes de prosseguir
    cpfCnpj: "",
    submitting: false,
  };

  async function load() {
    state.loading = true;
    render();
    try {
      const [quota, profile] = await Promise.all([getSubscription(), getProfile()]);
      state.quota = quota;
      state.profile = profile;
      state.cpfCnpj = profile?.cpf_cnpj || "";
    } catch (err) {
      state.error = err.message;
    }
    state.loading = false;
    render();
  }

  async function startCheckout(plano) {
    state.error = "";
    const digits = String(state.cpfCnpj || "").replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      state.checkoutPlano = plano;
      render();
      return;
    }
    state.submitting = true;
    render();
    try {
      const { url } = await createAsaasCheckout(plano, digits);
      window.location.href = url;
    } catch (err) {
      state.error = err.data?.code === "cpf_required" ? "CPF ou CNPJ inválido — confira os números." : err.message;
      state.checkoutPlano = err.data?.code === "cpf_required" ? plano : null;
      state.submitting = false;
      render();
    }
  }

  function render() {
    if (state.loading) {
      app.innerHTML = `<div class="profile-screen"><p class="auth-subtitle">Carregando...</p></div>`;
      return;
    }

    const planoAtual = state.quota?.plano || "trial";

    app.innerHTML = `
      <header class="topbar">
        <span class="wordmark serif">Anuncia</span>
        <button type="button" id="back-btn">Voltar</button>
      </header>
      <div class="dashboard" style="max-width: 780px;">
        <h1 class="auth-title">Meu plano</h1>
        <p class="auth-subtitle">${state.quota ? `Plano atual: ${PLAN_LABELS[planoAtual] || planoAtual} — ${state.quota.usado ?? 0}${state.quota.limite ? `/${state.quota.limite}` : ""} lançamentos ${state.quota.ciclo === "mensal" ? "este mês" : "no total"}` : ""}</p>

        ${state.error ? `<p class="auth-error">${state.error}</p>` : ""}

        <div class="pricing-grid" style="margin-top: 24px;">
          ${PLANOS.map((p) => {
            const isCurrent = planoAtual === p.id && state.quota?.status === "active";
            return `
              <div class="price-card">
                <p class="price-name">${p.nome}</p>
                <p class="price-value">${p.preco}<span>/mês</span></p>
                <p class="price-resumo">${p.resumo}</p>
                <ul class="price-items">
                  ${p.itens.map((item) => `<li>${item}</li>`).join("")}
                </ul>
                ${state.checkoutPlano === p.id ? `
                  <label style="margin-bottom: 12px;">CPF ou CNPJ (necessário pra emitir cobrança)
                    <input type="text" id="cpf-input" value="${state.cpfCnpj}" placeholder="000.000.000-00" />
                  </label>
                ` : ""}
                <button type="button" class="btn-plan" data-plan="${p.id}" ${isCurrent || state.submitting ? "disabled" : ""}>
                  ${isCurrent ? "Plano atual" : state.submitting && state.checkoutPlano === p.id ? "Abrindo checkout..." : state.checkoutPlano === p.id ? "Continuar" : "Assinar"}
                </button>
                <p class="price-fidelidade">Sem fidelidade — cancele quando quiser</p>
              </div>
            `;
          }).join("")}
        </div>
        <p class="field-hint" style="margin-top: 24px;">Pagamento processado pela Asaas — PIX, boleto ou cartão, você escolhe na hora de pagar.</p>
      </div>
    `;

    document.querySelector("#back-btn").addEventListener("click", onBack);
    document.querySelectorAll("[data-plan]").forEach((btn) => {
      btn.addEventListener("click", () => startCheckout(btn.dataset.plan));
    });
    const cpfInput = document.querySelector("#cpf-input");
    if (cpfInput) {
      cpfInput.addEventListener("input", (e) => { state.cpfCnpj = e.target.value; });
    }
  }

  await load();
}
