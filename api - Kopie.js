import { SUPABASE_URL, SUPABASE_KEY } from "./data.js";

// ---- lokaler Speicher (best effort) ----------------------------------------
export const ls = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },
};

// ---- Supabase REST ---------------------------------------------------------
async function sb(path, { method = "GET", body, prefer } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
    if (method !== "GET") headers["Content-Type"] = "application/json";
    if (prefer) headers["Prefer"] = prefer;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("Supabase error", res.status, await res.text());
      return { ok: false };
    }
    const text = await res.text();
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch (e) {
    console.error("Supabase request failed", e);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMenu() {
  const r = await sb("pos_menu?select=*&active=eq.true&order=sort_order.asc");
  return r.ok && Array.isArray(r.data) && r.data.length > 0 ? r.data : null;
}

export async function upsertOrders(rows) {
  const r = await sb("pos_orders?on_conflict=id", {
    method: "POST",
    body: rows,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return r.ok;
}

// alle Bestellungen eines Zeitraums (blättert, weil Supabase max. 1000 Zeilen pro Abfrage liefert)
export async function fetchOrders(from, to) {
  const all = [];
  const PAGE = 1000;
  for (let offset = 0; offset < 200000; offset += PAGE) {
    const r = await sb(
      `pos_orders?select=*&day=gte.${from}&day=lte.${to}&order=created_at.asc&limit=${PAGE}&offset=${offset}`
    );
    if (!r.ok || !Array.isArray(r.data)) return null;
    all.push(...r.data);
    if (r.data.length < PAGE) break;
  }
  return all;
}

export async function upsertClosing(row) {
  const r = await sb("pos_closings?on_conflict=day", {
    method: "POST",
    body: [row],
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return r.ok;
}

export async function fetchClosings() {
  const r = await sb("pos_closings?select=*&order=day.desc&limit=60");
  return r.ok && Array.isArray(r.data) ? r.data : null;
}
