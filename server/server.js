require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { generateLaunchPackage, regenerateAsset, GenerationError, ASSET_TYPES } = require("./ai");

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

// ── Sprint 2: imóvel ─────────────────────────────────────────────────────────

const PROPERTY_FIELDS = [
  "titulo_interno", "tipo", "finalidade", "operacao", "preco", "condominio", "iptu",
  "cidade", "bairro", "endereco_publico", "area_total", "area_privativa",
  "dormitorios", "suites", "banheiros", "vagas", "andar", "mobiliado",
  "caracteristicas", "diferenciais", "estado_conservacao", "descricao_entorno",
  "regras", "observacoes",
];
const PROPERTY_STATUS = ["rascunho", "gerado", "revisando", "aprovado", "arquivado"];

// Validação de consistência (P0 do Sprint 2) — preço/área/quartos e campos
// obrigatórios sem conflito. Roda tanto em create quanto em update.
function validateProperty(body, { partial } = { partial: false }) {
  const errors = [];
  const has = (f) => body[f] !== undefined && body[f] !== null;

  if (!partial && (!body.titulo_interno || !String(body.titulo_interno).trim())) {
    errors.push("titulo_interno é obrigatório");
  }

  for (const f of ["preco", "condominio", "iptu", "area_total", "area_privativa"]) {
    if (has(f) && (typeof body[f] !== "number" || body[f] < 0)) {
      errors.push(`${f} precisa ser um número >= 0`);
    }
  }
  for (const f of ["dormitorios", "suites", "banheiros", "vagas"]) {
    if (has(f) && (!Number.isInteger(body[f]) || body[f] < 0)) {
      errors.push(`${f} precisa ser um número inteiro >= 0`);
    }
  }
  if (has("area_total") && has("area_privativa") && body.area_privativa > body.area_total) {
    errors.push("area_privativa não pode ser maior que area_total");
  }
  if (has("dormitorios") && has("suites") && body.suites > body.dormitorios) {
    errors.push("suites não pode ser maior que dormitorios");
  }
  if (has("status") && !PROPERTY_STATUS.includes(body.status)) {
    errors.push(`status precisa ser um de: ${PROPERTY_STATUS.join(", ")}`);
  }
  return errors;
}

app.get("/api/properties", requireAuth, async (req, res) => {
  let query = supabase
    .from("anuncia_properties")
    .select("*")
    .eq("user_id", req.userId)
    .order("updated_at", { ascending: false });

  const { q, status } = req.query;
  if (status) query = query.eq("status", status);
  if (q) {
    const term = `%${q}%`;
    query = query.or(`titulo_interno.ilike.${term},cidade.ilike.${term},bairro.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Erro ao listar imóveis" });
  res.json(data);
});

app.get("/api/properties/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("anuncia_properties")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Erro ao buscar imóvel" });
  if (!data) return res.status(404).json({ error: "Imóvel não encontrado" });
  res.json(data);
});

app.post("/api/properties", requireAuth, async (req, res) => {
  const errors = validateProperty(req.body, { partial: false });
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const insert = { user_id: req.userId, status: "rascunho" };
  for (const f of PROPERTY_FIELDS) if (req.body[f] !== undefined) insert[f] = req.body[f];

  const { data, error } = await supabase.from("anuncia_properties").insert(insert).select().single();
  if (error) {
    console.error("[properties/create]", error.message);
    return res.status(500).json({ error: "Erro ao criar imóvel" });
  }
  res.status(201).json(data);
});

app.put("/api/properties/:id", requireAuth, async (req, res) => {
  const errors = validateProperty(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const updates = { updated_at: new Date().toISOString() };
  for (const f of PROPERTY_FIELDS) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.status !== undefined) updates.status = req.body.status;

  const { data, error } = await supabase
    .from("anuncia_properties")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Erro ao atualizar imóvel" });
  if (!data) return res.status(404).json({ error: "Imóvel não encontrado" });
  res.json(data);
});

app.post("/api/properties/:id/duplicate", requireAuth, async (req, res) => {
  const { data: original, error: fetchError } = await supabase
    .from("anuncia_properties")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: "Erro ao buscar imóvel" });
  if (!original) return res.status(404).json({ error: "Imóvel não encontrado" });

  const { id, created_at, updated_at, ...rest } = original;
  const copy = { ...rest, titulo_interno: `${original.titulo_interno} (cópia)`, status: "rascunho" };

  const { data, error } = await supabase.from("anuncia_properties").insert(copy).select().single();
  if (error) return res.status(500).json({ error: "Erro ao duplicar imóvel" });
  res.status(201).json(data);
});

app.delete("/api/properties/:id", requireAuth, async (req, res) => {
  const { error, count } = await supabase
    .from("anuncia_properties")
    .delete({ count: "exact" })
    .eq("id", req.params.id)
    .eq("user_id", req.userId);
  if (error) return res.status(500).json({ error: "Erro ao excluir imóvel" });
  if (!count) return res.status(404).json({ error: "Imóvel não encontrado" });
  res.json({ sucesso: true });
});

// ── Sprint 3: geração do pacote de lançamento ───────────────────────────────
// Idempotência: o cliente envia idempotency_key (gerado 1x por clique de
// "Gerar"). Duplo clique / retry de rede reenviando a mesma chave nunca
// dispara uma segunda chamada de IA nem um segundo usage_event.

async function fetchOwnedProperty(propertyId, userId) {
  const { data } = await supabase
    .from("anuncia_properties")
    .select("*")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

app.post("/api/properties/:id/generate", requireAuth, async (req, res) => {
  const { idempotency_key, asset_types, instruction } = req.body || {};
  if (!idempotency_key || typeof idempotency_key !== "string") {
    return res.status(400).json({ error: "idempotency_key é obrigatório" });
  }

  const assetTypes = asset_types && asset_types.length ? asset_types : ASSET_TYPES;
  const invalidTypes = assetTypes.filter((t) => !ASSET_TYPES.includes(t));
  if (invalidTypes.length) {
    return res.status(400).json({ error: `tipos de ativo inválidos: ${invalidTypes.join(", ")}` });
  }

  const property = await fetchOwnedProperty(req.params.id, req.userId);
  if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });

  const { data: profile } = await supabase
    .from("anuncia_professional_profiles")
    .select("*")
    .eq("id", req.userId)
    .maybeSingle();

  // Replay idempotente: mesma chave já usada.
  const { data: existing } = await supabase
    .from("anuncia_launch_packages")
    .select("*")
    .eq("idempotency_key", idempotency_key)
    .maybeSingle();

  if (existing && existing.property_id !== property.id) {
    return res.status(409).json({ error: "idempotency_key já usada em outro imóvel" });
  }
  if (existing?.status === "concluido") {
    const pkg = await fetchPackageWithAssets(existing.id);
    return res.json({ ...pkg, replay: true });
  }
  if (existing?.status === "gerando") {
    return res.status(409).json({ error: "Geração já em andamento para esta chave, aguarde", retryable: true });
  }

  let packageRow = existing; // status 'erro' → reaproveita a linha pra retry
  if (packageRow) {
    await supabase.from("anuncia_launch_packages").update({ status: "gerando" }).eq("id", packageRow.id);
  } else {
    const { count } = await supabase
      .from("anuncia_launch_packages")
      .select("id", { count: "exact", head: true })
      .eq("property_id", property.id);

    const { data: inserted, error: insertError } = await supabase
      .from("anuncia_launch_packages")
      .insert({ property_id: property.id, idempotency_key, status: "gerando", versao: (count || 0) + 1 })
      .select()
      .maybeSingle();

    if (insertError) {
      // corrida: outra requisição com a mesma chave inseriu primeiro
      if (insertError.code === "23505") {
        return res.status(409).json({ error: "Geração já em andamento para esta chave, aguarde", retryable: true });
      }
      console.error("[generate/insert-package]", insertError.message);
      return res.status(500).json({ error: "Erro ao iniciar geração" });
    }
    packageRow = inserted;
  }

  try {
    const { result, modelo_usado } = await generateLaunchPackage({ profile, property, assetTypes, instruction });

    // Path de retry após erro: garante que não sobra lixo de uma tentativa anterior.
    await supabase.from("anuncia_content_assets").delete().eq("package_id", packageRow.id);

    const assetsToInsert = result.assets.map((a) => ({
      package_id: packageRow.id,
      tipo: a.type,
      titulo: a.title || "",
      conteudo: a.content,
      status: "gerado",
      origem: "geracao_ia",
      origem_campos: a.source_fields || [],
    }));
    const { data: insertedAssets, error: assetsError } = await supabase
      .from("anuncia_content_assets")
      .insert(assetsToInsert)
      .select();
    if (assetsError) throw new Error(`falha ao salvar ativos: ${assetsError.message}`);
    // Sem snapshot de histórico aqui de propósito: a v1 recém-criada JÁ é o
    // "current" (linha viva em anuncia_content_assets). Uma entrada no
    // histórico só é gravada quando essa linha vai ser SUBSTITUÍDA (ver
    // snapshotAssetVersion, chamado antes de cada update/regenerate/restore)
    // — snapshotar aqui também duplicaria a v1 na primeira edição.

    const alertRows = [];
    for (const w of result.global_warnings || []) {
      alertRows.push({
        package_id: packageRow.id,
        categoria: w.category,
        severidade: w.severity,
        explicacao: w.message,
        sugestao: w.suggestion || "",
        trecho: w.excerpt || "",
      });
    }
    for (const a of result.assets) {
      const savedAsset = insertedAssets.find((sa) => sa.tipo === a.type);
      for (const warn of a.warnings || []) {
        alertRows.push({
          package_id: packageRow.id,
          asset_id: savedAsset?.id,
          categoria: "other",
          severidade: "low",
          explicacao: warn,
        });
      }
    }
    if (alertRows.length) {
      const { error: alertsError } = await supabase.from("anuncia_compliance_alerts").insert(alertRows);
      if (alertsError) console.error("[generate/alerts]", alertsError.message);
    }

    await supabase
      .from("anuncia_launch_packages")
      .update({ status: "concluido", modelo_usado })
      .eq("id", packageRow.id);

    if (property.status === "rascunho") {
      await supabase.from("anuncia_properties").update({ status: "gerado", updated_at: new Date().toISOString() }).eq("id", property.id);
    }

    await supabase.from("anuncia_usage_events").insert({
      user_id: req.userId,
      tipo_evento: "geracao",
      metadata: { property_id: property.id, package_id: packageRow.id, modelo: modelo_usado, asset_types: assetTypes },
    });

    const pkg = await fetchPackageWithAssets(packageRow.id);
    res.status(201).json(pkg);
  } catch (err) {
    console.error("[generate]", err.message);
    await supabase.from("anuncia_launch_packages").update({ status: "erro" }).eq("id", packageRow.id);
    const retryable = err instanceof GenerationError ? err.retryable : true;
    res.status(502).json({ error: "Falha ao gerar pacote. O imóvel não foi alterado — pode tentar novamente.", retryable });
  }
});

async function fetchPackageWithAssets(packageId) {
  const { data: pkg } = await supabase.from("anuncia_launch_packages").select("*").eq("id", packageId).maybeSingle();
  const { data: assets } = await supabase.from("anuncia_content_assets").select("*").eq("package_id", packageId).order("tipo");
  const { data: alerts } = await supabase.from("anuncia_compliance_alerts").select("*").eq("package_id", packageId);
  return { ...pkg, assets: assets || [], global_warnings: alerts || [] };
}

app.get("/api/properties/:id/packages", requireAuth, async (req, res) => {
  const property = await fetchOwnedProperty(req.params.id, req.userId);
  if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });

  const { data, error } = await supabase
    .from("anuncia_launch_packages")
    .select("*")
    .eq("property_id", property.id)
    .order("versao", { ascending: false });
  if (error) return res.status(500).json({ error: "Erro ao listar pacotes" });
  res.json(data);
});

app.get("/api/packages/:id", requireAuth, async (req, res) => {
  const { data: pkg } = await supabase.from("anuncia_launch_packages").select("*, anuncia_properties!inner(user_id)").eq("id", req.params.id).maybeSingle();
  if (!pkg || pkg.anuncia_properties.user_id !== req.userId) return res.status(404).json({ error: "Pacote não encontrado" });
  const full = await fetchPackageWithAssets(pkg.id);
  res.json(full);
});

app.put("/api/packages/:id/checklist", requireAuth, async (req, res) => {
  const { data: pkg } = await supabase.from("anuncia_launch_packages").select("*, anuncia_properties!inner(user_id)").eq("id", req.params.id).maybeSingle();
  if (!pkg || pkg.anuncia_properties.user_id !== req.userId) return res.status(404).json({ error: "Pacote não encontrado" });
  const patch = req.body?.state;
  if (!patch || typeof patch !== "object") return res.status(400).json({ error: "state é obrigatório" });

  const merged = { ...(pkg.checklist_state || {}), ...patch };
  const { data, error } = await supabase
    .from("anuncia_launch_packages")
    .update({ checklist_state: merged })
    .eq("id", pkg.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Erro ao salvar checklist" });
  res.json({ checklist_state: data.checklist_state });
});

// ── Sprint 4: editor, regeneração e histórico de um ativo ───────────────────

async function fetchOwnedAsset(assetId, userId) {
  const { data: asset } = await supabase.from("anuncia_content_assets").select("*").eq("id", assetId).maybeSingle();
  if (!asset) return null;
  const { data: pkg } = await supabase
    .from("anuncia_launch_packages")
    .select("*, anuncia_properties!inner(user_id, id)")
    .eq("id", asset.package_id)
    .maybeSingle();
  if (!pkg || pkg.anuncia_properties.user_id !== userId) return null;
  return { asset, package: pkg, property_id: pkg.anuncia_properties.id };
}

async function snapshotAssetVersion(asset) {
  await supabase.from("anuncia_content_asset_versions").insert({
    asset_id: asset.id, versao: asset.versao, titulo: asset.titulo, conteudo: asset.conteudo, origem: asset.origem,
  });
}

app.put("/api/assets/:id", requireAuth, async (req, res) => {
  const owned = await fetchOwnedAsset(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: "Ativo não encontrado" });
  const { content, title } = req.body || {};
  if (!content || !String(content).trim()) return res.status(400).json({ error: "content é obrigatório" });

  await snapshotAssetVersion(owned.asset);

  const { data, error } = await supabase
    .from("anuncia_content_assets")
    .update({
      conteudo: content,
      titulo: title !== undefined ? title : owned.asset.titulo,
      versao: owned.asset.versao + 1,
      origem: "edicao_manual",
      status: "editado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", owned.asset.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Erro ao salvar edição" });
  res.json(data);
});

app.post("/api/assets/:id/regenerate", requireAuth, async (req, res) => {
  const owned = await fetchOwnedAsset(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: "Ativo não encontrado" });
  const { instruction } = req.body || {};
  if (!instruction || !String(instruction).trim()) return res.status(400).json({ error: "instruction é obrigatório" });

  const property = await fetchOwnedProperty(owned.property_id, req.userId);
  if (!property) return res.status(404).json({ error: "Imóvel não encontrado" });
  const { data: profile } = await supabase.from("anuncia_professional_profiles").select("*").eq("id", req.userId).maybeSingle();

  try {
    const { content, title, warnings, modelo_usado } = await regenerateAsset({
      profile, property, assetType: owned.asset.tipo, currentContent: owned.asset.conteudo, instruction,
    });

    await snapshotAssetVersion(owned.asset);

    const { data, error } = await supabase
      .from("anuncia_content_assets")
      .update({
        conteudo: content,
        titulo: title !== undefined ? title : owned.asset.titulo,
        versao: owned.asset.versao + 1,
        origem: "regeneracao_ia",
        status: "gerado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", owned.asset.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: "Erro ao salvar regeneração" });

    await supabase.from("anuncia_usage_events").insert({
      user_id: req.userId,
      tipo_evento: "regeneracao",
      metadata: { asset_id: owned.asset.id, tipo: owned.asset.tipo, modelo: modelo_usado, instruction },
    });

    res.json({ ...data, warnings: warnings || [] });
  } catch (err) {
    console.error("[regenerate]", err.message);
    const retryable = err instanceof GenerationError ? err.retryable : true;
    res.status(502).json({ error: "Falha ao regenerar. O conteúdo atual não foi alterado — pode tentar novamente.", retryable });
  }
});

app.get("/api/assets/:id/versions", requireAuth, async (req, res) => {
  const owned = await fetchOwnedAsset(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: "Ativo não encontrado" });
  const { data, error } = await supabase
    .from("anuncia_content_asset_versions")
    .select("*")
    .eq("asset_id", owned.asset.id)
    .order("versao", { ascending: false });
  if (error) return res.status(500).json({ error: "Erro ao buscar histórico" });
  res.json({ current: owned.asset, history: data });
});

app.post("/api/assets/:id/versions/:versionId/restore", requireAuth, async (req, res) => {
  const owned = await fetchOwnedAsset(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: "Ativo não encontrado" });
  const { data: version } = await supabase
    .from("anuncia_content_asset_versions")
    .select("*")
    .eq("id", req.params.versionId)
    .eq("asset_id", owned.asset.id)
    .maybeSingle();
  if (!version) return res.status(404).json({ error: "Versão não encontrada" });

  await snapshotAssetVersion(owned.asset);

  const { data, error } = await supabase
    .from("anuncia_content_assets")
    .update({
      conteudo: version.conteudo,
      titulo: version.titulo,
      versao: owned.asset.versao + 1,
      origem: "restauracao",
      status: "editado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", owned.asset.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: "Erro ao restaurar versão" });
  res.json(data);
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
