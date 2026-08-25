require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
// limit maior que o default (100kb) pra caber logo em base64 (até 2MB de imagem)
app.use(express.json({ limit: "4mb" }));

// Supabase client (service role) — falha graciosa se env não estiver
// configurada ainda, pra health check funcionar mesmo antes do Sprint 1.
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
} else {
  console.warn("[SUPABASE] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas — rotas autenticadas vão falhar até serem definidas no Railway.");
}

// Auth — padrão IRYON (Supabase Auth puro, sem JWT próprio). Ver CLAUDE.md.
async function requireAuth(req, res, next) {
  if (!supabase) return res.status(503).json({ error: "Supabase não configurado" });
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Autenticação necessária" });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Token inválido ou expirado" });
  req.userId = user.id;
  req.userEmail = user.email;
  next();
}

app.get("/api/health", (_, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── Sprint 1: perfil profissional ──────────────────────────────────────────
// Nenhuma chave de IA/Supabase deve aparecer no frontend — todas as chamadas
// de IA passam por este backend (ver "Regras de implementação" no prompt mestre).

const PROFILE_FIELDS = [
  "nome_publico", "creci", "estado", "cidade", "imobiliaria",
  "contatos", "redes_sociais", "tom_de_voz", "exemplos_voz",
  "palavras_preferidas", "palavras_proibidas", "cores",
];

app.get("/api/profile", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("anuncia_professional_profiles")
    .select("*")
    .eq("id", req.userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Erro ao buscar perfil" });
  res.json(data || { id: req.userId, onboarding_completo: false });
});

app.put("/api/profile", requireAuth, async (req, res) => {
  const updates = {};
  for (const field of PROFILE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nenhum campo válido enviado" });
  }
  if (req.body.onboarding_completo !== undefined) {
    updates.onboarding_completo = !!req.body.onboarding_completo;
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("anuncia_professional_profiles")
    .upsert({ id: req.userId, ...updates }, { onConflict: "id" })
    .select()
    .single();
  if (error) {
    console.error("[profile/update]", error.message);
    return res.status(500).json({ error: "Erro ao salvar perfil" });
  }
  res.json(data);
});

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

app.post("/api/profile/logo", requireAuth, async (req, res) => {
  const { logoBase64, mimeType } = req.body || {};
  const ext = LOGO_ALLOWED_MIME[mimeType];
  if (!logoBase64 || !ext) {
    return res.status(400).json({ error: "Envie logoBase64 + mimeType (png, jpeg, webp ou svg)" });
  }
  const buffer = Buffer.from(logoBase64, "base64");
  if (buffer.length > LOGO_MAX_BYTES) {
    return res.status(400).json({ error: "Logo maior que 2MB" });
  }

  const path = `${req.userId}/logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("anuncia-logos")
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) {
    console.error("[profile/logo]", uploadError.message);
    return res.status(500).json({ error: "Erro ao enviar logo" });
  }

  const { data: publicUrlData } = supabase.storage.from("anuncia-logos").getPublicUrl(path);
  // cache-bust: mesmo path, upload novo precisa forçar o browser a buscar de novo
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("anuncia_professional_profiles")
    .upsert({ id: req.userId, logo_url: logoUrl, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (dbError) return res.status(500).json({ error: "Logo enviada, mas falhou ao salvar no perfil" });

  res.json({ logo_url: logoUrl });
});

// ── Sprint 1: exclusão de conta ─────────────────────────────────────────────
// Cascateia automaticamente pra profile/properties/etc via ON DELETE CASCADE
// (ver db/supabase_setup.sql) — não precisa apagar tabela por tabela aqui.
app.delete("/api/account", requireAuth, async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.userId);
  if (error) {
    console.error("[account/delete]", error.message);
    return res.status(500).json({ error: "Erro ao excluir conta" });
  }
  res.json({ sucesso: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Anuncia backend rodando na porta ${PORT}`);
});
