-- Seed de demonstração (Sprint 0, item P0 "Criar seed/demo").
-- Requer um usuário já existente no Supabase Auth (crie um usuário de teste
-- e substitua DEMO_USER_ID pelo UUID real antes de rodar).

-- Perfil de corretor de exemplo
INSERT INTO anuncia_professional_profiles (
  id, nome_publico, creci, estado, cidade, imobiliaria,
  contatos, redes_sociais, tom_de_voz,
  palavras_preferidas, palavras_proibidas, plan, onboarding_completo
) VALUES (
  'DEMO_USER_ID',
  'Ana Beatriz Corretora',
  '12345-F',
  'SP',
  'São Paulo',
  'Independente',
  '{"telefone": "+55 11 90000-0000", "whatsapp": "+55 11 90000-0000", "email": "ana@exemplo.com"}',
  '{"instagram": "@anabeatriz.imoveis"}',
  'Direto, caloroso, sem formalidade excessiva. Sempre termina com o WhatsApp.',
  ARRAY['charmoso', 'iluminado', 'pronto para morar'],
  ARRAY['oportunidade única', 'garantido'],
  'trial',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Imóvel de exemplo
INSERT INTO anuncia_properties (
  id, user_id, titulo_interno, tipo, finalidade, operacao, preco, condominio, iptu,
  cidade, bairro, area_total, area_privativa, dormitorios, suites, banheiros, vagas,
  andar, mobiliado, caracteristicas, diferenciais, estado_conservacao,
  descricao_entorno, status
) VALUES (
  gen_random_uuid(),
  'DEMO_USER_ID',
  'Apto Vila Madalena 2Q reformado',
  'apartamento',
  'residencial',
  'venda',
  650000,
  850,
  180,
  'São Paulo',
  'Vila Madalena',
  72,
  65,
  2,
  1,
  2,
  1,
  '5º andar',
  FALSE,
  ARRAY['varanda', 'academia no prédio', 'portaria 24h'],
  ARRAY['reformado em 2025', 'vista livre'],
  'reformado',
  'A 5 minutos do metrô Vila Madalena, próximo a bares e restaurantes.',
  'rascunho'
);
