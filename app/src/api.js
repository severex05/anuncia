import { supabase } from "./supabaseClient.js";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

async function authedFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Sessão local aponta pra um token que o backend não reconhece mais
    // (ex: conta apagada em outro lugar) — sai limpo em vez de travar o
    // usuário numa tela de erro cru.
    if (res.status === 401 && token) {
      await supabase.auth.signOut();
      window.location.reload();
      return new Promise(() => {}); // nunca resolve — o reload já está a caminho
    }
    const error = new Error(data?.error || "Erro na requisição");
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const getProfile = () => authedFetch("/api/profile");

export const getSubscription = () => authedFetch("/api/subscription");

export const createAsaasCheckout = (plano, cpfCnpj) =>
  authedFetch("/api/asaas/create-checkout", { method: "POST", body: JSON.stringify({ plano, cpfCnpj }) });

// Best-effort: não deve travar o cadastro se a sessão ainda não existir
// (ex: confirmação de e-mail pendente) ou se a chamada falhar por qualquer motivo.
export const logSignupEvent = () => authedFetch("/api/events/signup", { method: "POST" }).catch(() => {});

export const updateProfile = (updates) =>
  authedFetch("/api/profile", { method: "PUT", body: JSON.stringify(updates) });

export const uploadLogo = (logoBase64, mimeType) =>
  authedFetch("/api/profile/logo", {
    method: "POST",
    body: JSON.stringify({ logoBase64, mimeType }),
  });

export const deleteAccount = () => authedFetch("/api/account", { method: "DELETE" });

export const listProperties = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  return authedFetch(`/api/properties${qs ? `?${qs}` : ""}`);
};

export const getProperty = (id) => authedFetch(`/api/properties/${id}`);

export const quickFillProperty = (texto) =>
  authedFetch("/api/properties/parse-text", { method: "POST", body: JSON.stringify({ texto }) });

export const createProperty = (fields) =>
  authedFetch("/api/properties", { method: "POST", body: JSON.stringify(fields) });

export const updateProperty = (id, fields) =>
  authedFetch(`/api/properties/${id}`, { method: "PUT", body: JSON.stringify(fields) });

export const duplicateProperty = (id) => authedFetch(`/api/properties/${id}/duplicate`, { method: "POST" });

export const uploadPropertyMedia = (propertyId, fotoBase64, mimeType) =>
  authedFetch(`/api/properties/${propertyId}/media`, {
    method: "POST",
    body: JSON.stringify({ fotoBase64, mimeType }),
  });

export const deletePropertyMedia = (mediaId) => authedFetch(`/api/media/${mediaId}`, { method: "DELETE" });

export const deleteProperty = (id) => authedFetch(`/api/properties/${id}`, { method: "DELETE" });

export const generatePackage = (propertyId, { idempotencyKey, assetTypes, instruction }) =>
  authedFetch(`/api/properties/${propertyId}/generate`, {
    method: "POST",
    body: JSON.stringify({ idempotency_key: idempotencyKey, asset_types: assetTypes, instruction }),
  });

export const listPackages = (propertyId) => authedFetch(`/api/properties/${propertyId}/packages`);

export const getPackage = (packageId) => authedFetch(`/api/packages/${packageId}`);

export const updateChecklist = (packageId, state) =>
  authedFetch(`/api/packages/${packageId}/checklist`, { method: "PUT", body: JSON.stringify({ state }) });

export const updateAsset = (assetId, { content, title }) =>
  authedFetch(`/api/assets/${assetId}`, { method: "PUT", body: JSON.stringify({ content, title }) });

export const regenerateAsset = (assetId, instruction) =>
  authedFetch(`/api/assets/${assetId}/regenerate`, { method: "POST", body: JSON.stringify({ instruction }) });

export const getAssetVersions = (assetId) => authedFetch(`/api/assets/${assetId}/versions`);

export const restoreAssetVersion = (assetId, versionId) =>
  authedFetch(`/api/assets/${assetId}/versions/${versionId}/restore`, { method: "POST" });

export async function exportPackage(packageId, format) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BACKEND_URL}/api/packages/${packageId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Erro ao exportar");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `anuncia.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const createShareLink = (packageId) => authedFetch(`/api/packages/${packageId}/share`, { method: "POST" });

export const revokeShareLink = (packageId) => authedFetch(`/api/packages/${packageId}/share`, { method: "DELETE" });

export async function getNarrationAudio(text) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BACKEND_URL}/api/narration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error = new Error(data?.error || "Falha ao gerar narração");
    error.status = res.status;
    throw error;
  }
  return res.blob();
}

export const getPublicPackage = (token) =>
  fetch(`${BACKEND_URL}/api/public/packages/${token}`).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Link inválido");
    return data;
  });
