// Cópia de shared/constants.js — copiado manualmente (sem workspace/monorepo
// tooling no MVP). Precisa ficar dentro de server/ porque o deploy do
// Railway usa server/ como diretório raiz isolado (não inclui pastas irmãs
// como shared/) — um require("../shared/...") quebra em produção mesmo
// funcionando em dev local.

const ASSET_TYPES = [
  "long_description",
  "short_description",
  "instagram",
  "facebook",
  "whatsapp",
  "email",
  "reel_script",
  "headline",
  "checklist",
];

const ALERT_CATEGORIES = [
  "missing_fact",
  "unsupported_claim",
  "sensitive_language",
  "consistency",
  "other",
];

const ALERT_SEVERITIES = ["low", "medium", "high"];

const PROPERTY_STATUS = ["rascunho", "gerado", "revisando", "aprovado", "arquivado"];

const PLANS = ["trial", "solo", "pro", "equipe"];

module.exports = { ASSET_TYPES, ALERT_CATEGORIES, ALERT_SEVERITIES, PROPERTY_STATUS, PLANS };
