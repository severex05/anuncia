require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

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

// Sprint 1+: rotas de perfil profissional, imóvel, geração, exportação e
// billing entram aqui, seguindo o contrato descrito em CLAUDE_CODE_PROMPT.md.
// Nenhuma chave de IA/Supabase deve aparecer no frontend — todas as chamadas
// de IA passam por este backend (ver "Regras de implementação" no prompt mestre).

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Listing Launch OS backend rodando na porta ${PORT}`);
});
