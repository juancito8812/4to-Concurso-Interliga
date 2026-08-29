#!/usr/bin/env node
// sync-db.js — Sincroniza Supabase con el calendario real regenerado:
//  1. matches: upsert 1618 fixtures reales + DELETE filas muertas (no en calendario, sin predicciones)
//  2. predictions: remapear match_id a los nuevos ids reales; borrar predicciones de partidos inexistentes
//  3. teams: rebuild con equipos reales 2026/27 (mantiene perfiles intactos)
// Uso: SUPABASE_SERVICE_ROLE_KEY=... node sync-db.js

const fs = require("fs");
const path = require("path");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = "https://ilkndkqcmxvlufxaugog.supabase.co/rest/v1";
const DATA_DIR = path.join(__dirname, "..", "src", "data");

const fixtures = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "officialFixtures.json"), "utf8"));

if (!KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY requerida");
  process.exit(1);
}

const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

async function get(qs) {
  const all = [];
  const base = qs.includes("?") ? qs + "&" : qs + "?";
  for (let offset = 0; offset < 100000; offset += 1000) {
    const r = await fetch(URL + "/" + base + `limit=1000&offset=${offset}`, { headers: H });
    if (!r.ok) throw new Error(`GET ${qs}: HTTP ${r.status} ${await r.text()}`);
    const rows = await r.json();
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return all;
}
async function post(qs, body, prefer = "") {
  const r = await fetch(URL + "/" + qs, {
    method: "POST",
    headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${qs}: HTTP ${r.status} ${await r.text()}`);
  const text = await r.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { return []; }
}
async function patch(qs, body) {
  const r = await fetch(URL + "/" + qs, { method: "PATCH", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${qs}: HTTP ${r.status} ${await r.text()}`);
  const text = await r.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { return []; }
}
async function del(qs) {
  const r = await fetch(URL + "/" + qs, { method: "DELETE", headers: H });
  if (!r.ok) throw new Error(`DELETE ${qs}: HTTP ${r.status} ${await r.text()}`);
  const text = await r.text();
  if (!text) return [];
  try { return JSON.parse(text); } catch { return []; }
}

async function main() {
  // ---------- 1. matches: upsert + limpieza ----------
  const CHUNK = 300;
  for (let i = 0; i < fixtures.length; i += CHUNK) {
    // NOTA: sin result_home/result_away para no pisar resultados persistidos por el cron
    const part = fixtures.slice(i, i + CHUNK).map((f) => ({
      id: f.id,
      home_team: f.home_team,
      away_team: f.away_team,
      match_date: f.match_date,
      league: f.league,
    }));
    await post(`matches?on_conflict=id`, part, "resolution=merge-duplicates,return=minimal");
  }
  console.log(`✅ matches: ${fixtures.length} fixtures reales insertados/actualizados`);

  // Borrar filas muertas: no en calendario (ninguna predicción las referencia ya)
  const newIds = new Set(fixtures.map((f) => f.id));
  const existing = await get("matches?select=id,result_home&limit=2000");
  console.log(`   matches en DB: ${existing.length}`);
  const preds = await get("predictions?select=match_id&limit=1000");
  const predIds = new Set(preds.map((p) => p.match_id));
  const toDelete = existing.filter((m) => !newIds.has(m.id) && !predIds.has(m.id));
  console.log(`   muertos (sin predicciones): ${toDelete.length}`);
  for (let i = 0; i < toDelete.length; i += 200) {
    const ids = toDelete.slice(i, i + 200).map((m) => m.id).join(",");
    await del(`matches?id=in.(${ids})`);
  }
  console.log("✅ matches: filas muertas eliminadas");

  // ---------- 2. predictions: remapear a ids reales ----------
  // Clave con league + fecha para no colisionar (ej: Torino vs Monza existe en Copa Italia Y Serie A)
  const pairs = new Map();
  fixtures.forEach((f) => {
    const k = `${f.league}|${f.home_team}|${f.away_team}`;
    if (!pairs.has(k)) pairs.set(k, f.id);
  });
  const dbPreds = await get("predictions?select=id,user_id,match_id&limit=1000");
  const matchById = {};
  (await get("matches?select=id,home_team,away_team,league&limit=2000")).forEach((m) => (matchById[m.id] = m));

  let remapped = 0;
  let deleted = 0;
  for (const p of dbPreds) {
    const oldMatch = matchById[p.match_id];
    if (!oldMatch) continue;
    const newId = pairs.get(`${oldMatch.league}|${oldMatch.home_team}|${oldMatch.away_team}`);
    if (newId && newId !== p.match_id) {
      await patch(`predictions?id=eq.${p.id}`, { match_id: newId });
      remapped++;
    } else if (!newId) {
      // partido inexistente en el calendario real (ej: Wolfsburg vs Bayern)
      await del(`prediction_scorers?prediction_id=eq.${p.id}`);
      await del(`predictions?id=eq.${p.id}`);
      deleted++;
    }
  }
  console.log(`✅ predictions: ${remapped} remapeadas a ids reales, ${deleted} eliminadas (partidos inexistentes)`);

  // ---------- 3. teams: rebuild con equipos reales ----------
  const profiles = await get("profiles?select=display_name,team_id&limit=100");
  const usedTeamIds = new Set(profiles.map((p) => p.team_id).filter(Boolean));

  const oldTeams = await get("teams?select=id,name,league&limit=300");
  const toDeleteTeams = oldTeams.filter((t) => !usedTeamIds.has(t.id));
  for (let i = 0; i < toDeleteTeams.length; i += 100) {
    await new Promise((r) => setTimeout(r, 2000));
    const ids = toDeleteTeams.slice(i, i + 100).map((t) => t.id).join(",");
    try { await del(`teams?id=in.(${ids})`); } catch (e) { console.warn("   (teams en uso, se conservan)", e.message.slice(0, 80)); }
  }
  console.log(`✅ teams: ${toDeleteTeams.length} stale eliminados (${usedTeamIds.size} en uso por perfiles)`);

  // Insertar equipos reales con logos desde los fixtures
  const logos = {};
  fixtures.forEach((f) => {
    if (f.home_logo) logos[f.home_team] = f.home_logo;
    if (f.away_logo) logos[f.away_team] = f.away_logo;
  });
  const leagueByTeam = {};
  fixtures.forEach((f) => {
    if (f.league === "Copa Italia") return;
    leagueByTeam[f.home_team] = f.league;
    leagueByTeam[f.away_team] = f.league;
  });
  // UEL/UECL: equipos sin partidos aún (Wikipedia), sin logo por ahora
  const teamData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "teamAliases.json"), "utf8"));
  Object.entries(teamData.teamCups).forEach(([team, cups]) => {
    if (leagueByTeam[team]) return;
    if (cups.includes("europa")) leagueByTeam[team] = "Europa League";
    else if (cups.includes("conference")) leagueByTeam[team] = "Conference League";
    else if (cups.includes("champions")) leagueByTeam[team] = "Champions League";
    else if (cups.includes("coppaitalia")) leagueByTeam[team] = "Copa Italia";
  });

  const usedTeamNames = new Set(oldTeams.filter((t) => usedTeamIds.has(t.id)).map((t) => t.name));
  const toInsert = [];
  Object.entries(leagueByTeam).forEach(([team, league]) => {
    if (usedTeamNames.has(team)) return;
    toInsert.push({ name: team, league, logo_url: logos[team] || null });
  });
  for (let i = 0; i < toInsert.length; i += 100) {
    await new Promise((r) => setTimeout(r, 2000));
    await post(`teams?on_conflict=name,league`, toInsert.slice(i, i + 100));
  }
  console.log(`✅ teams: ${toInsert.length} equipos reales agregados (${Object.keys(logos).length} con logo)`);

  // ---------- 3b. Resultados conocidos: PATCH a las filas nuevas ----------
  const evResults = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "officialEvaluatedMatches.json"), "utf8"));
  let resultsPatched = 0;
  for (const m of evResults) {
    if (m.result_home === null || m.result_home === undefined) continue;
    const rows = await get(`matches?id=eq.${m.id}&select=id,result_home`);
    if (!rows.length || rows[0].result_home !== null) continue;
    await patch(`matches?id=eq.${m.id}`, { result_home: m.result_home, result_away: m.result_away });
    resultsPatched++;
  }
  console.log(`✅ matches: ${resultsPatched} resultados conocidos persistidos en las filas nuevas`);

  // ---------- 4. officialEvaluatedMatches.json: remapear ids ----------
  const evPath = path.join(DATA_DIR, "officialEvaluatedMatches.json");
  const ev = JSON.parse(fs.readFileSync(evPath, "utf8"));
  let evChanged = 0;
  ev.forEach((m) => {
    const newId = pairs.get(`${m.home_team}|${m.away_team}`);
    if (newId && newId !== m.id) {
      m.id = newId;
      evChanged++;
    }
  });
  if (evChanged) fs.writeFileSync(evPath, JSON.stringify(ev, null, 2) + "\n");
  console.log(`✅ officialEvaluatedMatches: ${evChanged} ids remapeados (${ev.length - evChanged} históricos 2025/26 conservados)`);

  // ---------- 5. officialEvaluatedPredictions.json: remapear + limpiar muertas ----------
  const epPath = path.join(DATA_DIR, "officialEvaluatedPredictions.json");
  const ep = JSON.parse(fs.readFileSync(epPath, "utf8"));
  const newEvIds = new Set(ev.map((m) => m.id));
  const filtered = ep.filter((p) => newEvIds.has(p.match_id) || p.points !== undefined);
  const epChanged = filtered.length !== ep.length || filtered.some((p, i) => p.match_id !== ep[i].match_id);
  if (epChanged) fs.writeFileSync(epPath, JSON.stringify(filtered, null, 2) + "\n");
  console.log(`✅ officialEvaluatedPredictions: ${ep.length} → ${filtered.length} (${ep.length - filtered.length} eliminadas por partido inexistente)`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
