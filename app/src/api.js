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
  if (!res.ok) throw new Error(data?.error || "Erro na requisição");
  return data;
}

export const getProfile = () => authedFetch("/api/profile");

export const updateProfile = (updates) =>
  authedFetch("/api/profile", { method: "PUT", body: JSON.stringify(updates) });

export const uploadLogo = (logoBase64, mimeType) =>
  authedFetch("/api/profile/logo", {
    method: "POST",
    body: JSON.stringify({ logoBase64, mimeType }),
  });

export const deleteAccount = () => authedFetch("/api/account", { method: "DELETE" });
