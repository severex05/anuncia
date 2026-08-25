// Constantes compartilhadas entre app/ e server/ — copiar manualmente
// (sem workspace/monorepo tooling no MVP, mesmo padrão dos outros projetos).

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
