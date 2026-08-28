// Sprint 3 — geração do pacote de lançamento via IA.
// Chamada de IA acontece SÓ aqui no backend (nunca no frontend, ver
// CLAUDE_CODE_PROMPT.md "Regras de implementação"). Contrato de resposta
// (property_summary/assets/global_warnings) é forçado via tool-use e
// revalidado manualmente porque o schema do tool não garante presença de
// TODOS os tipos de ativo pedidos, só o formato de cada item.

const Anthropic = require("@anthropic-ai/sdk");
const { ASSET_TYPES, ALERT_CATEGORIES, ALERT_SEVERITIES, PROPERTY_TIPOS, PROPERTY_FINALIDADES, PROPERTY_OPERACOES } = require("./constants");

// Campos que NUNCA podem ser enviados à IA — nem pra gerar conteúdo, nem pra
// extrair dados de texto livre. valor_minimo_negociacao é uso interno do
// corretor (ver db/supabase_setup.sql); jamais deve aparecer num material
// gerado nem influenciar o texto.
function stripInternalFields(property) {
  const clean = { ...property };
  delete clean.id;
  delete clean.user_id;
  delete clean.created_at;
  delete clean.updated_at;
  delete clean.valor_minimo_negociacao;
  return clean;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const REQUEST_TIMEOUT_MS = 45000;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 })
  : null;

class GenerationError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.retryable = retryable;
  }
}

const RESPONSE_TOOL = {
  name: "emitir_pacote_lancamento",
  description: "Emite o pacote de lançamento imobiliário no formato estruturado exigido pelo produto.",
  input_schema: {
    type: "object",
    properties: {
      property_summary: { type: "string" },
      assets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ASSET_TYPES },
            title: { type: "string" },
            content: { type: "string" },
            source_fields: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
          },
          required: ["type", "content"],
        },
      },
      global_warnings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ALERT_CATEGORIES },
            severity: { type: "string", enum: ALERT_SEVERITIES },
            message: { type: "string" },
            suggestion: { type: "string" },
            excerpt: { type: "string", description: "Trecho curto do texto gerado ao qual o alerta se refere, se aplicável." },
          },
          required: ["category", "severity", "message"],
        },
      },
    },
    required: ["assets"],
  },
};

const REGENERATE_TOOL = {
  name: "emitir_ativo_regenerado",
  description: "Emite a versão revisada de um único ativo de marketing, aplicando a instrução do usuário.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      content: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: ["content"],
  },
};

const SYSTEM_PROMPT = `Você gera pacotes de marketing para lançamento de imóveis, para um SaaS brasileiro de corretores autônomos e pequenas imobiliárias (Anuncia).

Regras absolutas:
- Nunca invente fatos que não estejam nos dados estruturados do imóvel (endereço, distância, escola, comércio, segurança do bairro, valorização futura).
- Nunca infira ou mencione perfil de família, religião, raça, nacionalidade, idade ou condição financeira do público-alvo ou dos moradores.
- Nunca prometa valorização, retorno de investimento ou garantia de venda.
- Nunca use frases como "garantia de compliance" ou linguagem que sugira validação jurídica.
- Use somente os campos fornecidos. Se um dado relevante para um ativo não foi informado, produza o ativo sem esse dado em vez de inventá-lo, e registre um alerta em global_warnings com category "missing_fact".
- Respeite rigorosamente as palavras_proibidas do perfil do corretor — nunca as use.
- Escreva em português do Brasil, no tom de voz descrito no perfil do corretor.
- Todo o conteúdo é um rascunho para revisão humana antes de publicar — não afirme que já está pronto para publicação.

Você deve responder chamando a ferramenta emitir_pacote_lancamento, preenchendo um item em "assets" para CADA tipo de ativo solicitado, e listando qualquer risco de compliance em "global_warnings" (categorias: missing_fact, unsupported_claim, sensitive_language, consistency, other). Quando o alerta se referir a um trecho específico de algum ativo gerado, inclua esse trecho em "excerpt".`;

function buildUserMessage({ profile, property, assetTypes, instruction }) {
  const perfilResumo = {
    nome_publico: profile?.nome_publico || "",
    creci: profile?.creci || "",
    cidade: profile?.cidade || "",
    imobiliaria: profile?.imobiliaria || "",
    tom_de_voz: profile?.tom_de_voz || "",
    palavras_preferidas: profile?.palavras_preferidas || [],
    palavras_proibidas: profile?.palavras_proibidas || [],
  };

  const imovel = stripInternalFields(property);

  const partes = [
    `Perfil do corretor:\n${JSON.stringify(perfilResumo, null, 2)}`,
    `Dados do imóvel:\n${JSON.stringify(imovel, null, 2)}`,
    `Tipos de ativo solicitados: ${assetTypes.join(", ")}`,
    `Idioma e região: pt-BR`,
  ];
  if (instruction) partes.push(`Instrução adicional do usuário: ${instruction}`);

  return partes.join("\n\n");
}

function validateContract(obj, requestedTypes) {
  const errors = [];
  if (!obj || typeof obj !== "object") return ["resposta vazia ou inválida"];

  if (!Array.isArray(obj.assets)) {
    errors.push("assets precisa ser um array");
  } else {
    const foundTypes = new Set();
    for (const asset of obj.assets) {
      if (!asset || typeof asset !== "object") { errors.push("item de asset inválido"); continue; }
      if (!ASSET_TYPES.includes(asset.type)) errors.push(`tipo de asset inválido: ${asset.type}`);
      if (!asset.content || !String(asset.content).trim()) errors.push(`asset ${asset.type} sem conteúdo`);
      foundTypes.add(asset.type);
    }
    for (const t of requestedTypes) {
      if (!foundTypes.has(t)) errors.push(`tipo de ativo solicitado ausente na resposta: ${t}`);
    }
  }

  if (obj.global_warnings !== undefined) {
    if (!Array.isArray(obj.global_warnings)) {
      errors.push("global_warnings precisa ser um array");
    } else {
      for (const w of obj.global_warnings) {
        if (!ALERT_CATEGORIES.includes(w?.category)) errors.push(`categoria de alerta inválida: ${w?.category}`);
        if (!ALERT_SEVERITIES.includes(w?.severity)) errors.push(`severidade de alerta inválida: ${w?.severity}`);
        if (!w?.message) errors.push("alerta sem mensagem");
      }
    }
  }

  return errors;
}

function formatBRL(n) {
  if (n === null || n === undefined) return null;
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Mock de IA (P0 do Sprint 3) — permite testar o fluxo completo sem
// ANTHROPIC_API_KEY configurada. Só usa campos fornecidos, nunca inventa.
function generateMock({ profile, property, assetTypes }) {
  const titulo = property.titulo_interno || "Imóvel";
  const local = [property.bairro, property.cidade].filter(Boolean).join(", ");
  const preco = formatBRL(property.preco);
  const fatos = [];
  if (property.dormitorios) fatos.push(`${property.dormitorios} dormitório(s)`);
  if (property.suites) fatos.push(`${property.suites} suíte(s)`);
  if (property.vagas) fatos.push(`${property.vagas} vaga(s)`);
  if (property.area_privativa) fatos.push(`${property.area_privativa}m² privativos`);
  const fatosTexto = fatos.length ? fatos.join(", ") : "";

  const base = {
    long_description: `${titulo}${local ? ` em ${local}` : ""}.${fatosTexto ? ` ${fatosTexto}.` : ""}${preco ? ` Valor: ${preco}.` : ""} [conteúdo de exemplo — modo mock, revisar antes de publicar]`,
    short_description: `${titulo}${local ? `, ${local}` : ""}.${preco ? ` ${preco}.` : ""}`,
    instagram: `✨ ${titulo}\n${fatosTexto}\n📍 ${local || "consulte localização"}\n\n[legenda de exemplo — modo mock]`,
    facebook: `${titulo} disponível${local ? ` em ${local}` : ""}. ${fatosTexto}. Fale com o corretor para mais detalhes.`,
    whatsapp: `Olá! Separei esse imóvel pra você: ${titulo}${local ? ` (${local})` : ""}. ${fatosTexto}${preco ? `. ${preco}` : ""}. Quer que eu te mande mais fotos?`,
    email: `Assunto: Novo lançamento — ${titulo}\n\nOlá,\n\nGostaria de apresentar este imóvel${local ? ` em ${local}` : ""}. ${fatosTexto}.\n\nFico à disposição para agendar uma visita.`,
    reel_script: `Cena 1: fachada/entrada — "${titulo}"\nCena 2: ambientes principais — destacar ${fatosTexto || "os diferenciais"}\nCena 3: chamada — "Consulte disponibilidade"`,
    headline: `${titulo}${local ? ` — ${local}` : ""}`,
    checklist: `- Confirmar preço e condições atuais\n- Confirmar disponibilidade\n- Revisar fotos autorizadas\n- Revisar dados antes de publicar`,
  };

  const assets = assetTypes.map((type) => ({
    type,
    title: base[type]?.split("\n")[0]?.slice(0, 80) || titulo,
    content: base[type] || `[${type}] conteúdo de exemplo — modo mock`,
    source_fields: Object.keys(stripInternalFields(property)).filter((k) => property[k] !== null && property[k] !== undefined && property[k] !== ""),
    warnings: [],
  }));

  return {
    property_summary: `${titulo}${local ? ` em ${local}` : ""}`,
    assets,
    global_warnings: [
      {
        category: "other",
        severity: "low",
        message: "Conteúdo gerado em modo mock (ANTHROPIC_API_KEY não configurada) — apenas para desenvolvimento.",
        suggestion: "Configure ANTHROPIC_API_KEY para gerar conteúdo real.",
      },
    ],
  };
}

async function callAnthropic({ profile, property, assetTypes, instruction }, correctionNote) {
  const userMessage = buildUserMessage({ profile, property, assetTypes, instruction })
    + (correctionNote ? `\n\nA resposta anterior teve os seguintes problemas, corrija: ${correctionNote}` : "");

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [RESPONSE_TOOL],
      tool_choice: { type: "tool", name: RESPONSE_TOOL.name },
    }, { timeout: REQUEST_TIMEOUT_MS });
  } catch (err) {
    console.error("[ai/anthropic]", err.message);
    throw new GenerationError("Provedor de IA indisponível ou timeout", { retryable: true });
  }

  const toolUse = response.content?.find((b) => b.type === "tool_use");
  if (!toolUse) throw new GenerationError("IA não retornou resposta estruturada", { retryable: true });
  return toolUse.input;
}

// Ponto de entrada único — decide mock vs IA real, valida contrato, tenta
// uma correção automática antes de desistir (retry não perde o rascunho:
// quem chama é responsável por não persistir nada em caso de erro).
async function generateLaunchPackage({ profile, property, assetTypes, instruction }) {
  const types = assetTypes && assetTypes.length ? assetTypes : ASSET_TYPES;

  if (!anthropic) {
    const mock = generateMock({ profile, property, assetTypes: types });
    return { result: mock, modelo_usado: "mock" };
  }

  let result = await callAnthropic({ profile, property, assetTypes: types, instruction });
  let errors = validateContract(result, types);

  if (errors.length) {
    console.warn("[ai/validate] resposta inválida, tentando 1 correção:", errors.join("; "));
    result = await callAnthropic({ profile, property, assetTypes: types, instruction }, errors.join("; "));
    errors = validateContract(result, types);
  }

  if (errors.length) {
    throw new GenerationError(`Resposta da IA não passou na validação: ${errors.join("; ")}`, { retryable: true });
  }

  return { result, modelo_usado: MODEL };
}

// Regeneração de mock — aplica transformações simples de acordo com
// palavras-chave da instrução, sem chamar IA nenhuma.
function regenerateMock({ currentContent, instruction }) {
  let content = currentContent;
  const lower = instruction.toLowerCase();

  if (lower.includes("curt") || lower.includes("resumi")) {
    content = content.split(/\n/)[0].slice(0, 140);
  }
  if (lower.includes("emoji")) {
    content = content.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/ {2,}/g, " ").trim();
  }
  if (lower.includes("diret")) {
    content = content.replace(/\s*\[conteúdo de exemplo[^\]]*\]/gi, "").trim();
  }
  if (content === currentContent) {
    content = `${currentContent}\n[mock: instrução "${instruction}" aplicada]`;
  }

  return { content, title: undefined, warnings: [] };
}

async function regenerateAsset({ profile, property, assetType, currentContent, instruction }) {
  if (!anthropic) {
    return { ...regenerateMock({ currentContent, instruction }), modelo_usado: "mock" };
  }

  const perfilResumo = {
    tom_de_voz: profile?.tom_de_voz || "",
    palavras_preferidas: profile?.palavras_preferidas || [],
    palavras_proibidas: profile?.palavras_proibidas || [],
  };
  const imovel = stripInternalFields(property);

  const userMessage = [
    `Ativo a revisar: ${assetType}`,
    `Conteúdo atual:\n${currentContent}`,
    `Instrução do usuário: ${instruction}`,
    `Perfil do corretor (tom/regras):\n${JSON.stringify(perfilResumo, null, 2)}`,
    `Dados do imóvel (não invente além disso):\n${JSON.stringify(imovel, null, 2)}`,
  ].join("\n\n");

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      tools: [REGENERATE_TOOL],
      tool_choice: { type: "tool", name: REGENERATE_TOOL.name },
    }, { timeout: REQUEST_TIMEOUT_MS });
  } catch (err) {
    console.error("[ai/regenerate]", err.message);
    throw new GenerationError("Provedor de IA indisponível ou timeout", { retryable: true });
  }

  const toolUse = response.content?.find((b) => b.type === "tool_use");
  if (!toolUse?.input?.content || !String(toolUse.input.content).trim()) {
    throw new GenerationError("IA não retornou conteúdo válido", { retryable: true });
  }
  return { ...toolUse.input, modelo_usado: MODEL };
}

// Roadmap NOW: atalho de preenchimento — o corretor cola uma frase solta
// (ex: "apto 2 quartos reformado na Vila Madalena, 65m², vaga, R$480 mil") e
// isso vira campos estruturados pra ele revisar no formulário. Diferente da
// geração de conteúdo: não produz material final, só reorganiza texto que o
// próprio corretor já escreveu — por isso o tom "só preencha o que está
// explícito" é ainda mais rígido aqui do que na geração normal.

const PARSE_TOOL = {
  name: "extrair_dados_imovel",
  description: "Extrai os dados estruturados de um imóvel a partir de uma descrição em texto livre.",
  input_schema: {
    type: "object",
    properties: {
      titulo_interno: { type: "string", description: "Um título curto pra identificar o imóvel internamente, só se o texto sugerir um (ex: apelido do imóvel). Não invente um genérico." },
      tipo: { type: "string", enum: PROPERTY_TIPOS, description: "Tipo do imóvel." },
      finalidade: { type: "string", enum: PROPERTY_FINALIDADES, description: "Finalidade: residencial, comercial ou misto." },
      operacao: { type: "string", enum: PROPERTY_OPERACOES, description: "Se é pra vender (venda) ou alugar (aluguel)." },
      preco: { type: "number", description: "Valor de venda ou aluguel em reais, sem símbolo." },
      condominio: { type: "number", description: "Valor do condomínio mensal em reais." },
      iptu: { type: "number", description: "Valor do IPTU em reais." },
      area_total: { type: "number", description: "Área/metragem do imóvel em m² — use quando o texto disser só 'm²' sem especificar se é privativa." },
      area_privativa: { type: "number", description: "Área privativa em m², só se o texto distinguir explicitamente de área total/comum." },
      dormitorios: { type: "integer", description: "Número de quartos/dormitórios." },
      suites: { type: "integer", description: "Número de suítes." },
      banheiros: { type: "integer", description: "Número de banheiros." },
      vagas: { type: "integer", description: "Número de vagas de garagem." },
      andar: { type: "string", description: "Andar do imóvel, ex: '5º andar'." },
      mobiliado: { type: "boolean", description: "Se o texto disser que é mobiliado/decorado." },
      cidade: { type: "string", description: "Cidade onde o imóvel está localizado." },
      bairro: { type: "string", description: "Bairro onde o imóvel está localizado." },
      endereco_publico: { type: "string", description: "Endereço (rua/avenida) se mencionado explicitamente." },
      caracteristicas: { type: "array", items: { type: "string" }, description: "Comodidades objetivas mencionadas: varanda, academia, portaria 24h, piscina, elevador, etc." },
      diferenciais: { type: "array", items: { type: "string" }, description: "Diferenciais mencionados: reformado, vista livre, esquina, nascente, etc." },
      estado_conservacao: { type: "string", description: "Estado de conservação, ex: 'reformado', 'novo', 'usado', se mencionado." },
    },
  },
};

const PARSE_SYSTEM_PROMPT = `Você extrai dados estruturados de imóveis a partir de uma descrição em texto livre escrita por um corretor brasileiro, para pré-preencher um formulário que ele vai revisar e corrigir manualmente antes de salvar.

Regras absolutas:
- Preencha SOMENTE os campos que estão clara e explicitamente presentes no texto.
- Nunca invente, estime, arredonde ou infira um valor que não foi dito.
- Números: extraia só o valor numérico (sem "R$", sem "m²", sem separador de milhar).
- Se o texto não permitir extrair nenhum campo com confiança, chame a ferramenta sem nenhuma propriedade preenchida.

Responda sempre chamando a ferramenta extrair_dados_imovel.`;

function parseMock(texto) {
  const fields = {};
  const preco = texto.match(/R\$\s?([\d.,]+)\s?(mil|k)?/i);
  if (preco) {
    let n = Number(preco[1].replace(/\./g, "").replace(",", "."));
    if (/mil|k/i.test(preco[2] || "")) n *= 1000;
    if (!Number.isNaN(n)) fields.preco = n;
  }
  const area = texto.match(/(\d+)\s?m²/i);
  if (area) fields.area_total = Number(area[1]);
  const dorm = texto.match(/(\d+)\s?(quartos?|dormit[óo]rios?|dorms?)/i);
  if (dorm) fields.dormitorios = parseInt(dorm[1], 10);
  const vagas = texto.match(/(\d+)\s?vagas?/i);
  if (vagas) fields.vagas = parseInt(vagas[1], 10);
  for (const t of PROPERTY_TIPOS) if (new RegExp(t, "i").test(texto)) { fields.tipo = t; break; }
  for (const o of PROPERTY_OPERACOES) if (new RegExp(o, "i").test(texto)) { fields.operacao = o; break; }
  return fields;
}

async function parsePropertyText({ texto }) {
  if (!anthropic) {
    return { fields: parseMock(texto), modelo_usado: "mock" };
  }

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: PARSE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: texto }],
      tools: [PARSE_TOOL],
      tool_choice: { type: "tool", name: PARSE_TOOL.name },
    }, { timeout: 20000 });
  } catch (err) {
    console.error("[ai/parse]", err.message);
    throw new GenerationError("Provedor de IA indisponível ou timeout", { retryable: true });
  }

  const toolUse = response.content?.find((b) => b.type === "tool_use");
  if (!toolUse) throw new GenerationError("Não foi possível organizar o texto", { retryable: true });
  return { fields: toolUse.input || {}, modelo_usado: MODEL };
}

module.exports = { generateLaunchPackage, regenerateAsset, parsePropertyText, GenerationError, ASSET_TYPES };
