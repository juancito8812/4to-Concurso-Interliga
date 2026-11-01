#!/usr/bin/env node
/**
 * Sincroniza estadísticas de tráfico del sitio a Supabase.
 *
 * Fuente: Cloudflare (API GraphQL)
 *   · Zona  -> httpRequests1dGroups (peticiones, vistas, únicos, bytes, amenazas)
 *   · Web Analytics (RUM) -> rumPageloadEventsAdaptiveGroups (visitas y páginas
 *     vistas de navegadores reales, más rutas/países/referentes/navegadores)
 *
 * Destino: tablas `site_stats_daily` y `site_stats_breakdown` (solo service_role).
 * El panel de admin las lee por la RPC `admin_site_stats()`.
 *
 * Uso:  node scripts/sync-site-analytics.mjs [días]
 * Env:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_API_TOKEN
 *       (opcional) CF_ZONE_TAG, CF_ACCOUNT_TAG, CF_RUM_SITE_TAG
 */

const DAYS = Math.min(Math.max(parseInt(process.argv[2] || "30", 10) || 30, 1), 90);

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";

const ZONE_TAG = process.env.CF_ZONE_TAG || "63457799d528cc4ddac1a6c9803f3b44";
const ACCOUNT_TAG = process.env.CF_ACCOUNT_TAG || "2612332b0c4acde45a21838fa8c342c6";
const RUM_SITE_TAG = process.env.CF_RUM_SITE_TAG || "b743e8220e664a44b2a8874fc3bea884";

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL) die("Falta NEXT_PUBLIC_SUPABASE_URL");
if (!SERVICE_KEY) die("Falta SUPABASE_SERVICE_ROLE_KEY");
if (!CF_TOKEN) die("Falta CLOUDFLARE_API_TOKEN");

const isoDay = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const fromDate = new Date(today.getTime() - (DAYS - 1) * 86400000);
const FROM = isoDay(fromDate);

async function cfGraphQL(query, attempt = 1) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    const detail = JSON.stringify(body.errors || body).slice(0, 400);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return cfGraphQL(query, attempt + 1);
    }
    throw new Error(`Cloudflare GraphQL ${res.status}: ${detail}`);
  }
  return body.data;
}

// --- 1. Rollup diario de la zona -------------------------------------------
async function fetchZoneDaily() {
  const data = await cfGraphQL(`{
    viewer {
      zones(filter: { zoneTag: "${ZONE_TAG}" }) {
        httpRequests1dGroups(
          limit: ${DAYS + 2}
          filter: { date_geq: "${FROM}" }
          orderBy: [date_ASC]
        ) {
          dimensions { date }
          sum { requests pageViews bytes cachedBytes threats }
          uniq { uniques }
        }
      }
    }
  }`);
  const rows = data?.viewer?.zones?.[0]?.httpRequests1dGroups || [];
  const map = new Map();
  for (const r of rows) {
    map.set(r.dimensions.date, {
      requests: r.sum?.requests || 0,
      page_views: r.sum?.pageViews || 0,
      uniques: r.uniq?.uniques || 0,
      bytes: r.sum?.bytes || 0,
      cached_bytes: r.sum?.cachedBytes || 0,
      threats: r.sum?.threats || 0,
    });
  }
  return map;
}

// --- 2. Web Analytics (RUM): visitas reales por día ------------------------
async function fetchRumDaily() {
  const data = await cfGraphQL(`{
    viewer {
      accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
        rumPageloadEventsAdaptiveGroups(
          limit: ${DAYS + 2}
          filter: { date_geq: "${FROM}", siteTag: "${RUM_SITE_TAG}" }
          orderBy: [date_ASC]
        ) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }`);
  const rows = data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  const map = new Map();
  for (const r of rows) {
    map.set(r.dimensions.date, { rum_pageviews: r.count || 0, rum_visits: r.sum?.visits || 0 });
  }
  return map;
}

// --- 3. Desgloses (rutas, países, referentes, navegadores) -----------------
const BREAKDOWNS = [
  { kind: "path", dim: "requestPath" },
  { kind: "country", dim: "countryName" },
  { kind: "referer", dim: "refererHost" },
  { kind: "browser", dim: "userAgentBrowser" },
];

async function fetchBreakdown(dim, limit = 15) {
  const data = await cfGraphQL(`{
    viewer {
      accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
        rumPageloadEventsAdaptiveGroups(
          limit: ${limit}
          filter: { date_geq: "${FROM}", siteTag: "${RUM_SITE_TAG}" }
          orderBy: [count_DESC]
        ) {
          count
          dimensions { ${dim} }
        }
      }
    }
  }`);
  const rows = data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  return rows
    .map((r) => ({ key: String(r.dimensions?.[dim] ?? "").slice(0, 300), hits: r.count || 0 }))
    .filter((r) => r.key && r.hits > 0);
}

// --- 4. Upsert en Supabase -------------------------------------------------
async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`${table} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return rows.length;
}

async function main() {
  console.log(`→ Ventana: ${FROM} … ${isoDay(today)} (${DAYS} días)`);

  const [zone, rum] = await Promise.all([fetchZoneDaily(), fetchRumDaily()]);
  const days = new Set([...zone.keys(), ...rum.keys()]);
  const dailyRows = [...days].sort().map((day) => ({
    day,
    requests: zone.get(day)?.requests ?? 0,
    page_views: zone.get(day)?.page_views ?? 0,
    uniques: zone.get(day)?.uniques ?? 0,
    bytes: zone.get(day)?.bytes ?? 0,
    cached_bytes: zone.get(day)?.cached_bytes ?? 0,
    threats: zone.get(day)?.threats ?? 0,
    rum_pageviews: rum.get(day)?.rum_pageviews ?? 0,
    rum_visits: rum.get(day)?.rum_visits ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const n1 = await upsert("site_stats_daily", dailyRows, "day");
  console.log(`✓ site_stats_daily: ${n1} días`);

  const breakdownRows = [];
  for (const { kind, dim } of BREAKDOWNS) {
    const rows = await fetchBreakdown(dim);
    // El desglose se guarda sobre la ventana completa, anclado al día de hoy,
    // para que la RPC sume sin duplicar días anteriores.
    await fetch(`${SUPABASE_URL}/rest/v1/site_stats_breakdown?kind=eq.${kind}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    for (const r of rows) breakdownRows.push({ day: isoDay(today), kind, key: r.key, hits: r.hits });
    console.log(`  · ${kind}: ${rows.length}`);
  }
  const n2 = await upsert("site_stats_breakdown", breakdownRows, "day,kind,key");
  console.log(`✓ site_stats_breakdown: ${n2} filas`);

  const sum = (k) => dailyRows.reduce((s, r) => s + (r[k] || 0), 0);
  console.log(
    `Resumen ${DAYS}d — vistas reales: ${sum("rum_pageviews")} · visitas: ${sum("rum_visits")} · peticiones: ${sum(
      "requests"
    )}`
  );
}

main().catch((e) => die(e.message));
