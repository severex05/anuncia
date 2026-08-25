-- Listing Launch OS — schema inicial (Sprint 0/1)
-- Tabelas prefixadas llos_. RLS: dono vê só o próprio dado; backend usa
-- sempre a service role key (nunca o cliente direto), mesmo padrão de
-- decifra-backend/supabase_setup.sql.

-- Perfil profissional do corretor (1:1 com auth.users)
CREATE TABLE IF NOT EXISTS llos_professional_profiles (
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
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'solo', 'pro', 'equipe')),
  stripe_customer_id TEXT,
  onboarding_completo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE llos_professional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê o próprio perfil" ON llos_professional_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role tem acesso total (profiles)" ON llos_professional_profiles
  USING (true) WITH CHECK (true);

-- Imóveis cadastrados
CREATE TABLE IF NOT EXISTS llos_properties (
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

ALTER TABLE llos_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê os próprios imóveis" ON llos_properties
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role tem acesso total (properties)" ON llos_properties
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_llos_properties_user ON llos_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_llos_properties_status ON llos_properties(user_id, status);

-- Mídia do imóvel (referência de arquivo, upload real fica pro Supabase Storage)
CREATE TABLE IF NOT EXISTS llos_property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES llos_properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  tipo TEXT DEFAULT 'foto',
  autorizacao_declarada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_property_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (media)" ON llos_property_media
  USING (true) WITH CHECK (true);

-- Pacote de lançamento gerado (uma "rodada" de geração por imóvel)
CREATE TABLE IF NOT EXISTS llos_launch_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES llos_properties(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'gerando',
  modelo_usado TEXT DEFAULT '',
  tokens_custo NUMERIC,
  idempotency_key TEXT UNIQUE,   -- evita geração/cobrança duplicada em duplo clique
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_launch_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (packages)" ON llos_launch_packages
  USING (true) WITH CHECK (true);

-- Cada ativo individual do pacote (descrição, instagram, whatsapp, etc.)
CREATE TABLE IF NOT EXISTS llos_content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES llos_launch_packages(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'long_description', 'short_description', 'instagram', 'facebook',
    'whatsapp', 'email', 'reel_script', 'headline', 'checklist'
  )),
  titulo TEXT DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'gerado',
  versao INTEGER NOT NULL DEFAULT 1,
  origem_campos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_content_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (assets)" ON llos_content_assets
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_llos_content_assets_package ON llos_content_assets(package_id);

-- Alertas de revisão/conformidade por ativo
CREATE TABLE IF NOT EXISTS llos_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES llos_content_assets(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'missing_fact', 'unsupported_claim', 'sensitive_language', 'consistency', 'other'
  )),
  severidade TEXT NOT NULL CHECK (severidade IN ('low', 'medium', 'high')),
  trecho TEXT DEFAULT '',
  explicacao TEXT DEFAULT '',
  sugestao TEXT DEFAULT '',
  estado TEXT DEFAULT 'pendente' CHECK (estado IN ('pendente', 'aceito', 'ignorado', 'editado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_compliance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (alerts)" ON llos_compliance_alerts
  USING (true) WITH CHECK (true);

-- Eventos de uso (analytics de produto + contador de consumo por plano)
CREATE TABLE IF NOT EXISTS llos_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,   -- ex: 'signup', 'primeiro_imovel', 'geracao', 'exportacao', 'assinatura'
  quantidade INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role tem acesso total (usage)" ON llos_usage_events
  USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_llos_usage_events_user ON llos_usage_events(user_id, tipo_evento, created_at);

-- Assinatura (1:1 com usuário; workspace/membership ficam pro modo equipe, P2)
CREATE TABLE IF NOT EXISTS llos_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plano TEXT NOT NULL DEFAULT 'trial' CHECK (plano IN ('trial', 'solo', 'pro', 'equipe')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  provider_id TEXT,             -- id da assinatura no provedor de billing (Stripe/Asaas)
  periodo_atual_inicio TIMESTAMPTZ,
  periodo_atual_fim TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE llos_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono vê a própria assinatura" ON llos_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role tem acesso total (subscriptions)" ON llos_subscriptions
  USING (true) WITH CHECK (true);
