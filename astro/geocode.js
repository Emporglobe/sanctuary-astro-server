/**
 * Geocoding
 * Primary: Nominatim (OpenStreetMap)
 * Fallback: Photon (Komoot)
 *
 * Nominatim can return 403 if User-Agent is missing or traffic is heavy.
 */
const fetch = require("node-fetch");

const UA = process.env.GEOCODE_USER_AGENT || "SanctuaryAstroServer/1.0 (contact: emporiglobe@gmail.com)";
const TIMEOUT_MS = Number(process.env.GEOCODE_TIMEOUT_MS || 9000);
const cache = new Map();

function key(q){ return String(q||"").trim().toLowerCase(); }

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch(_) {}
    return { ok: res.ok, status: res.status, data, text };
  } finally {
    clearTimeout(t);
  }
}

async function nominatim(q){
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
    q, format:"json", limit:"1", addressdetails:"1"
  }).toString();

  const r = await fetchJson(url, { headers: { "User-Agent": UA, "Accept":"application/json" }});
  if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
  const hit = Array.isArray(r.data) ? r.data[0] : null;
  if (!hit) throw new Error("Nominatim: no results");
  const lat = Number(hit.lat), lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Nominatim: invalid lat/lon");
  return { lat, lon, displayName: hit.display_name || q, provider:"nominatim" };
}

async function photon(q){
  const url = "https://photon.komoot.io/api/?" + new URLSearchParams({ q, limit:"1" }).toString();
  const r = await fetchJson(url, { headers: { "User-Agent": UA, "Accept":"application/json" }});
  if (!r.ok) throw new Error(`Photon HTTP ${r.status}`);
  const feat = r.data && r.data.features && r.data.features[0];
  const coords = feat && feat.geometry && feat.geometry.coordinates;
  if (!coords || coords.length < 2) throw new Error("Photon: no results");
  const lon = Number(coords[0]), lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Photon: invalid lat/lon");
  const p = feat.properties || {};
  const displayName = p.name ? [p.name, p.city, p.country].filter(Boolean).join(", ") : q;
  return { lat, lon, displayName, provider:"photon" };
}

async function geocodePlace(query){
  const k = key(query);
  if (!k) throw new Error("Empty place query");
  if (cache.has(k)) return cache.get(k);

  try {
    const r = await nominatim(query);
    cache.set(k, r); return r;
  } catch(e1) {
    const r = await photon(query);
    cache.set(k, r); return r;
  }
}

module.exports = { geocodePlace };
