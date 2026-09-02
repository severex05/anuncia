-- Anuncia — schema inicial (Sprint 0/1)
-- Tabelas prefixadas anuncia_. RLS: dono vê só o próprio dado; backend usa
-- sempre a service role key (nunca o cliente direto), mesmo padrão de
-- decifra-backend/supabase_setup.sql.

-- Perfil profissional do corretor (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS anuncia_professional_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_publico TEXT NOT NULL DEFAULT '',
  creci TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  imobiliaria TEXT DEFAULT '',
  contatos JSONB DEFAULT '{}',        -- {telefone, whatsapp, email}
  redes_sociais JSONB DEFAULT '{}',   -- {instagram, facebook}
  tom_de_voz TEXT DEFAULT '',
  exemplos_voz TEXT[] DEFAULT '{}',   -- 3-5 exemplos de texto próprio
  palavras_preferidas TEXT[] DEFAULT '{}',
  palavras_proibidas TEXT[] DEFAULT '{}',
  logo_url TEXT,
  cores JSONB DEFAULT '{}',
  cpf_cnpj TEXT DEFAULT '',           -- exigido pelo Asaas pra criar cliente de cobrança (Sprint 6)
  onboarding_completo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anuncia_professional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê o próprio perfil" ON anuncia_professional_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role tem acesso total (profiles)" ON anuncia_professional_profiles
  USING (true) WITH CHECK (true);

-- Imóveis cadastrados
CREATE TABLE IF NOT EXISTS anuncia_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo_interno TEXT NOT NULL,
  tipo TEXT DEFAULT '',
  finalidade TEXT DEFAULT '',
  operacao TEXT DEFAULT '',
  preco NUMERIC,
  condominio NUMERIC,
  iptu NUMERIC,
  cidade TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  endereco_publico TEXT DEFAULT '',
  area_total NUMERIC,
  area_privativa NUMERIC,
  dormitorios INTEGER,
  suites INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  andar TEXT DEFAULT '',
  mobiliado BOOLEAN,
  caracteristicas TEXT[] DEFAULT '{}',
  diferenciais TEXT[] DEFAULT '{}',
  estado_conservacao TEXT DEFAULT '',
  descricao_entorno TEXT DEFAULT '',
  regras TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'gerado', 'revisando', 'aprovado', 'arquivado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE anuncia_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê os próprios imóveis" ON anuncia_properties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role tem acesso total (properties)" ON anuncia_properties
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_properties_user ON anuncia_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_anuncia_properties_status ON anuncia_properties(user_id, status);

-- Mídia do imóvel (referência de arquivo, upload real fica pro Supabase Storage)
CREATE TABLE IF NOT EXISTS anuncia_property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES anuncia_properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  tipo TEXT DEFAULT 'foto',
  autorizacao_declarada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_property_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (media)" ON anuncia_property_media
  USING (true) WITH CHECK (true);

-- Pacote de lançamento gerado (uma "rodada" de geração por imóvel)
CREATE TABLE IF NOT EXISTS anuncia_launch_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES anuncia_properties(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'gerando',
  modelo_usado TEXT DEFAULT '',
  tokens_custo NUMERIC,
  idempotency_key TEXT UNIQUE,   -- evita geração/cobrança duplicada em duplo clique
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_launch_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (packages)" ON anuncia_launch_packages
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_launch_packages_property ON anuncia_launch_packages(property_id);
-- checklist_state (Sprint 4): {"0": true, "2": true, ...} — índice da linha do
-- ativo tipo "checklist" -> marcado ou não, antes de exportar.
ALTER TABLE anuncia_launch_packages ADD COLUMN IF NOT EXISTS checklist_state JSONB NOT NULL DEFAULT '{}';
-- Compartilhamento de página privada (Sprint 5): token opaco e imprevisível
-- (crypto.randomBytes), não sequencial. share_enabled=false revoga o acesso
-- sem precisar apagar o token (regenerar cria um novo token de qualquer forma).
ALTER TABLE anuncia_launch_packages ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE anuncia_launch_packages ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Cada ativo individual do pacote (descrição, instagram, whatsapp, etc.)
CREATE TABLE IF NOT EXISTS anuncia_content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES anuncia_launch_packages(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'long_description', 'short_description', 'instagram', 'facebook',
    'whatsapp', 'email', 'reel_script', 'headline', 'checklist'
  )),
  titulo TEXT DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'gerado',
  versao INTEGER NOT NULL DEFAULT 1,
  origem TEXT NOT NULL DEFAULT 'geracao_ia'
    CHECK (origem IN ('geracao_ia', 'edicao_manual', 'regeneracao_ia', 'restauracao')),
  origem_campos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_content_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (assets)" ON anuncia_content_assets
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_content_assets_package ON anuncia_content_assets(package_id);

-- Histórico de versões de um ativo (Sprint 4) — snapshot do conteúdo
-- anterior toda vez que o ativo é editado, regenerado ou restaurado.
CREATE TABLE IF NOT EXISTS anuncia_content_asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES anuncia_content_assets(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  titulo TEXT DEFAULT '',
  conteudo TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'edicao_manual'
    CHECK (origem IN ('geracao_ia', 'edicao_manual', 'regeneracao_ia', 'restauracao')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_content_asset_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (asset_versions)" ON anuncia_content_asset_versions
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_content_asset_versions_asset ON anuncia_content_asset_versions(asset_id, versao DESC);

-- Alertas de revisão/conformidade — podem ser por ativo específico (asset_id)
-- ou no nível do pacote inteiro (package_id), pois o contrato de geração da
-- IA distingue "warnings" por ativo de "global_warnings" do pacote (ver
-- server/ai.js). Pelo menos um dos dois precisa estar preenchido.
CREATE TABLE IF NOT EXISTS anuncia_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES anuncia_content_assets(id) ON DELETE CASCADE,
  package_id UUID REFERENCES anuncia_launch_packages(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'missing_fact', 'unsupported_claim', 'sensitive_language', 'consistency', 'other'
  )),
  severidade TEXT NOT NULL CHECK (severidade IN ('low', 'medium', 'high')),
  trecho TEXT DEFAULT '',
  explicacao TEXT DEFAULT '',
  sugestao TEXT DEFAULT '',
  estado TEXT DEFAULT 'pendente' CHECK (estado IN ('pendente', 'aceito', 'ignorado', 'editado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT compliance_alerts_scope_chk CHECK (asset_id IS NOT NULL OR package_id IS NOT NULL)
);
ALTER TABLE anuncia_compliance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (alerts)" ON anuncia_compliance_alerts
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_compliance_alerts_package ON anuncia_compliance_alerts(package_id);

-- Eventos de uso (analytics de produto + contador de consumo por plano)
CREATE TABLE IF NOT EXISTS anuncia_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,   -- ex: 'signup', 'primeiro_imovel', 'geracao', 'exportacao', 'assinatura'
  quantidade INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (usage)" ON anuncia_usage_events
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_usage_events_user ON anuncia_usage_events(user_id, tipo_evento, created_at);

-- Sprint 6: professional_profiles.plan e .stripe_customer_id removidos —
-- duplicavam anuncia_subscriptions (fonte única do plano) e citavam Stripe
-- (decisão real foi Asaas, ver CLAUDE.md). Nunca usados em código.
ALTER TABLE anuncia_professional_profiles DROP COLUMN IF EXISTS plan;
ALTER TABLE anuncia_professional_profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- Assinatura (1:1 com usuário; workspace/membership ficam pro modo equipe, P2)
CREATE TABLE IF NOT EXISTS anuncia_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plano TEXT NOT NULL DEFAULT 'trial' CHECK (plano IN ('trial', 'solo', 'pro', 'equipe')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  provider_id TEXT,             -- id da assinatura no provedor de billing (Stripe/Asaas)
  periodo_atual_inicio TIMESTAMPTZ,
  periodo_atual_fim TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê a própria assinatura" ON anuncia_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role tem acesso total (subscriptions)" ON anuncia_subscriptions
  USING (true) WITH CHECK (true);

-- Roadmap NOW (2026-08-28): campo interno de negociação — só o corretor vê,
-- NUNCA deve ser incluído no prompt de geração de conteúdo (ver server/ai.js,
-- que remove esse campo explicitamente do objeto enviado à IA).
ALTER TABLE anuncia_properties ADD COLUMN IF NOT EXISTS valor_minimo_negociacao NUMERIC;

-- Sprint 6 P1 (2026-08-28): checkout real Asaas — id do cliente Asaas (1:1 por
-- usuário), pra não recriar customer a cada checkout. provider_id (já existia)
-- guarda o id da assinatura Asaas.
ALTER TABLE anuncia_subscriptions ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Roadmap Later (2026-09-01): modo empreendimento/lançamento — cadastra o
-- empreendimento uma vez (fatos do prédio: incorporadora, diferenciais de
-- área comum, previsão de entrega) e cada unidade continua sendo um
-- anuncia_properties normal, só com development_id apontando pra cá.
-- Decisão deliberada: NÃO criar um fluxo de dados paralelo (geração de
-- pacote, edição, exportação, compartilhamento, duplicar já funcionam pra
-- qualquer anuncia_properties, unidade ou não) — só a origem dos fatos
-- compartilhados muda.
CREATE TABLE IF NOT EXISTS anuncia_developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  incorporadora TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  endereco_publico TEXT DEFAULT '',
  descricao_geral TEXT DEFAULT '',
  diferenciais TEXT[] DEFAULT '{}',
  previsao_entrega TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anuncia_developments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê os próprios empreendimentos" ON anuncia_developments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role tem acesso total (developments)" ON anuncia_developments
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_anuncia_developments_user ON anuncia_developments(user_id);

-- ON DELETE SET NULL: apagar o empreendimento não apaga as unidades, só
-- desvincula (mesma filosofia de não perder rascunho de trabalho do resto do app).
ALTER TABLE anuncia_properties ADD COLUMN IF NOT EXISTS development_id UUID REFERENCES anuncia_developments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_anuncia_properties_development ON anuncia_properties(development_id);

-- Roadmap Later (2026-09-01): headshot do corretor — dá rosto real a quem
-- está anunciando, usado no mini-site público (mais confiança pro
-- visitante/lead) e no card de encerramento do vídeo do roteiro de Reel.
-- Reaproveita o bucket anuncia-logos já existente (path
-- "<userId>/headshot.<ext>"), não precisa de bucket novo.
ALTER TABLE anuncia_professional_profiles ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

-- Página institucional pública do corretor (2026-09-02): "cartão de
-- visitas" digital de uma página só, linkável no bio do Instagram — reúne
-- perfil + portfólio (imóveis com status='aprovado', sem toggle novo por
-- imóvel). Opt-in explícito (pagina_publica_ativa=false por padrão, a
-- página só existe se o corretor ativar). slug é gerado automaticamente
-- pelo backend na primeira ativação (nome_publico + sufixo curto pra
-- unicidade, ex: "joao-silva-a3f9") e nunca é editável livremente pelo
-- usuário, pra não criar URL quebrada/colisão. Ver GET /api/public/corretor/:slug
-- em server/server.js — mesmo padrão de curadoria manual do
-- GET /api/public/packages/:token (nunca a linha crua da tabela).
ALTER TABLE anuncia_professional_profiles ADD COLUMN IF NOT EXISTS apresentacao TEXT DEFAULT '';
ALTER TABLE anuncia_professional_profiles ADD COLUMN IF NOT EXISTS pagina_publica_ativa BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE anuncia_professional_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
