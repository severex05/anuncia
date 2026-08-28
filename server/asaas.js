// Integração com o gateway de pagamento Asaas — mesmo padrão já em produção
// no IRYON e no VYRON (ver credentials_access.md), reaproveitado aqui pra não
// reinventar a forma da API. Decisão de negócio: Asaas, não Stripe (ver
// CLAUDE.md).

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE = process.env.ASAAS_SANDBOX === "true"
  ? "https://api-sandbox.asaas.com/v3"
  : "https://api.asaas.com/v3";

async function asaasRequest(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY },
    signal: AbortSignal.timeout(15000),
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${ASAAS_BASE}${path}`, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.errors?.[0]?.description || `Asaas ${r.status}`);
  return data;
}

// Valida dígito verificador de verdade (não só o tamanho) — reduz chamada à
// Asaas que ia falhar de qualquer forma com CPF/CNPJ digitado errado.
function isValidCpf(digits) {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

function isValidCnpj(digits) {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

function isValidCpfCnpj(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 11 ? isValidCpf(digits) : digits.length === 14 ? isValidCnpj(digits) : false;
}

// Notificação por WhatsApp vem desabilitada por padrão em customer novo —
// precisa habilitar notificação por notificação. Best-effort: nunca deve
// travar o checkout se isso falhar.
async function enableWhatsAppNotifications(customerId) {
  try {
    const { data: notifications } = await asaasRequest("GET", `/customers/${customerId}/notifications`);
    await Promise.all(
      (notifications || [])
        .filter((n) => !n.whatsappEnabledForCustomer)
        .map((n) => asaasRequest("PUT", `/notifications/${n.id}`, { whatsappEnabledForCustomer: true }).catch(() => {}))
    );
  } catch (e) {
    console.warn("[ASAAS] Não foi possível habilitar WhatsApp nas notificações:", e.message);
  }
}

// Planos vendidos hoje (equipe ainda não tem preço definido, ver billing.js).
const ASAAS_PLANOS = {
  solo: { nome: "Solo", valor: 97, cycle: "MONTHLY" },
  pro: { nome: "Pro", valor: 147, cycle: "MONTHLY" },
};

function planoPorValor(valor) {
  return Object.entries(ASAAS_PLANOS).find(([, p]) => p.valor === valor)?.[0] || null;
}

module.exports = { asaasRequest, isValidCpfCnpj, enableWhatsAppNotifications, ASAAS_PLANOS, planoPorValor };
