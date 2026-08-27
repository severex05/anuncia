// Limites de plano + verificação de cota — desacoplado do provedor de
// pagamento de propósito (BACKLOG Sprint 6: "provider pode ser trocado sem
// refazer domínio"). anuncia_subscriptions guarda plano/status em termos
// genéricos; o único campo específico de provedor é provider_id (Asaas no
// P1). Checkout real e webhook do Asaas ainda não existem — por enquanto o
// plano é alterado via endpoint admin (PUT /api/admin/subscriptions/:userId).

const PLAN_LIMITS = {
  trial: { ciclo: "total", limite: 1 },     // 1 pacote completo grátis, sem cartão, sem prazo
  solo: { ciclo: "mensal", limite: 10 },
  pro: { ciclo: "mensal", limite: 25 },
  equipe: { ciclo: "mensal", limite: null }, // ainda não vendido; null = sem limite nesta fase
};

async function getOrCreateSubscription(supabase, userId) {
  const { data } = await supabase
    .from("anuncia_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;

  const { data: created, error } = await supabase
    .from("anuncia_subscriptions")
    .insert({ user_id: userId })
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      // corrida: outra requisição já criou a linha
      const { data: retry } = await supabase
        .from("anuncia_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return retry;
    }
    throw error;
  }
  return created;
}

function startOfCurrentMonthISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function checkGenerationQuota(supabase, userId) {
  const subscription = await getOrCreateSubscription(supabase, userId);
  const planConfig = PLAN_LIMITS[subscription.plano] || PLAN_LIMITS.trial;

  if (subscription.status === "past_due" || subscription.status === "canceled") {
    return {
      allowed: false,
      reason: "assinatura_inativa",
      subscription,
      usado: null,
      limite: planConfig.limite,
      ciclo: planConfig.ciclo,
    };
  }

  if (planConfig.limite === null) {
    return { allowed: true, reason: null, subscription, usado: null, limite: null, ciclo: planConfig.ciclo };
  }

  const since = planConfig.ciclo === "mensal" ? startOfCurrentMonthISO() : "1970-01-01T00:00:00.000Z";
  const { count } = await supabase
    .from("anuncia_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tipo_evento", "geracao")
    .gte("created_at", since);

  const usado = count || 0;
  const allowed = usado < planConfig.limite;
  return {
    allowed,
    reason: allowed ? null : "limite_atingido",
    subscription,
    usado,
    limite: planConfig.limite,
    ciclo: planConfig.ciclo,
  };
}

module.exports = { PLAN_LIMITS, getOrCreateSubscription, checkGenerationQuota };
