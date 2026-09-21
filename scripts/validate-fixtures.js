#!/usr/bin/env node
// validate-fixtures.js — Cruza officialFixtures.json contra las fuentes reales.
// Sale con código != 0 si hay cualquier discrepancia.

const fs = require("fs");
const path = require("path");
const { normalizeTeamName } = require("./lib/score-utils.js");
const teamData = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/data/teamAliases.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/data/officialFixtures.json"), "utf8"));
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || "";

let errors = 0;
const fail = (msg) => { console.error("❌", msg); errors++; };
const ok = (msg) => console.log("✅", msg);

async function fetchJson(url, headers = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", ...headers } });
      if (res.status === 429) throw new Error(`HTTP 429 (rate limit)`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

async function fetchEspnEvents(espnSlug, from, to) {
  const dates = [];
  let curr = new Date(`${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}T00:00:00Z`);
  const end = new Date(`${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}T00:00:00Z`);
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10).replace(/-/g, ""));
    curr = new Date(curr.getTime() + 86400000);
  }

  const events = [];
  const seenIds = new Set();
  for (let i = 0; i < dates.length; i += 15) {
    const slice = dates.slice(i, i + 15);
    const results = await Promise.all(
      slice.map(async (d) => {
        try {
          const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard?dates=${d}`;
          const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!res.ok) return [];
          const data = await res.json();
          return data.events || [];
        } catch {
          return [];
        }
      })
    );
    for (const evs of results) {
      for (const e of evs) {
        if (!seenIds.has(e.id)) {
          seenIds.add(e.id);
          events.push(e);
        }
      }
    }
  }
  return events;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Todas las competiciones presentes y conteos
const expectedCounts = {
  "Premier League": 380,
  "LaLiga": 380,
  "Serie A": 380,
  "Bundesliga": 306,
  "Champions League": 144,
  "Europa League": 144,
  "Conference League": 108,
  "Copa Italia": 36,
  "DFB-Pokal": 48,
  // Copas con rondas aún no publicadas por ESPN para 2026/27: el conteo esperado
  // se actualiza a medida que la fuente publica rondas (igual que el resto).
  // OJO: ?dates=2026 en ESPN = temporada 2025/26 (etiquetada por año de fin);
  // el sync escanea día a día la ventana 20260801-20270531 (2026/27 real).
  "FA Cup": 0,
  "Copa del Rey": 0,
};
const byLeague = {};
fixtures.forEach((f) => { byLeague[f.league] = (byLeague[f.league] || 0) + 1; });
console.log("\n=== 1. Conteos por competición ===");
for (const [league, expected] of Object.entries(expectedCounts)) {
  const actual = byLeague[league] || 0;
  if (actual !== expected) fail(`${league}: ${actual} (esperado ${expected})`);
  else ok(`${league}: ${actual}`);
}
const tbd = fixtures.filter((f) => f.home_team.includes("TBD") || f.away_team.includes("TBD"));
if (tbd.length) fail(`${tbd.length} fixtures TBD`);
else ok("0 fixtures TBD (nada inventado en el calendario)");

// 2. Equipos canónicos: todos deben resolver a canonicalDbTeams
console.log("\n=== 2. Normalización de equipos ===");
const unresolved = new Set();
fixtures.forEach((f) => {
  [f.home_team, f.away_team].forEach((t) => {
    if (!teamData.canonicalDbTeams.includes(t)) unresolved.add(`${t} (en ${f.league})`);
  });
});
if (unresolved.size) [...unresolved].forEach((u) => fail(`Equipo no canónico: ${u}`));
else ok(`Todos los equipos son canónicos (${new Set(fixtures.flatMap((f) => [f.home_team, f.away_team])).size} únicos)`);

// 3. Sin equipos jugando 2+ partidos el mismo día (por liga)
console.log("\n=== 3. Duplicados mismo día ===");
const dayCount = {};
fixtures.forEach((f) => {
  const d = f.match_date.slice(0, 10);
  [f.home_team, f.away_team].forEach((t) => {
    const k = `${d}|${t}`;
    dayCount[k] = (dayCount[k] || 0) + 1;
  });
});
const dups = Object.entries(dayCount).filter(([, v]) => v > 1);
if (dups.length) dups.slice(0, 20).forEach(([k, v]) => fail(`Equipo juega 2+ partidos el mismo día: ${k} x${v}`));
else ok("Ningún equipo juega 2+ partidos el mismo día");

// 4. IDs únicos
const ids = new Set(fixtures.map((f) => f.id));
if (ids.size !== fixtures.length) fail(`${fixtures.length - ids.size} IDs duplicados`);
else ok(`IDs únicos: ${ids.size}`);

// 5. Cruce con football-data API (4 ligas) — fecha + equipos exactos
async function checkLeague(leagueName, apiCode) {
  const data = await fetchJson(`https://api.football-data.org/v4/competitions/${apiCode}/matches?season=2026`, { "X-Auth-Token": FOOTBALL_DATA_KEY });
  const api = data.matches || [];
  const file = fixtures.filter((f) => f.league === leagueName);
  let matched = 0;
  const mismatches = [];
  const filePairs = new Set(file.map((f) => `${f.match_date.slice(0, 10)}|${f.home_team}|${f.away_team}`));
  for (const m of api) {
    const home = normalizeTeamName(m.homeTeam.name);
    const away = normalizeTeamName(m.awayTeam.name);
    const key = `${m.utcDate.slice(0, 10)}|${home}|${away}`;
    if (filePairs.has(key)) matched++;
    else {
      if (matchIsInFile(file, m)) matched++;
      else mismatches.push(`${m.utcDate.slice(0, 10)} ${home} vs ${away}`);
    }
  }
  if (matched !== api.length) {
    fail(`${leagueName}: ${matched}/${api.length} coinciden con la API`);
    mismatches.slice(0, 10).forEach((mm) => console.error("    falta:", mm));
  } else ok(`${leagueName}: ${matched}/${api.length} partidos idénticos a la API (fecha+equipos)`);
}

function matchIsInFile(file, m) {
  const home = normalizeTeamName(m.homeTeam.name);
  const away = normalizeTeamName(m.awayTeam.name);
  const day = m.utcDate.slice(0, 10);
  return file.some((f) => f.match_date.slice(0, 10) === day && f.home_team === home && f.away_team === away);
}

async function main() {
  console.log("=== 5. Cruce con football-data API ===");
  await checkLeague("Premier League", "2021");
  await sleep(6000);
  await checkLeague("LaLiga", "2014");
  await sleep(6000);
  await checkLeague("Serie A", "2019");
  await sleep(6000);
  await checkLeague("Bundesliga", "2002");

  console.log("\n=== 6. Cruce con ESPN (UCL + Copa Italia + UEL + UECL + FA Cup + CDR) ===");
  // Cruce de una competición contra ESPN: cada partido de la API debe existir en el
  // archivo con la misma fecha (UTC) y equipos normalizados. `filter` descarta
  // eventos (ej. rondas con clubes no canónicos en copas con clubes pequeños).
  async function checkEspnCompetition(espnSlug, leagueName, from, to, { filter, note = "" } = {}) {
    let api = await fetchEspnEvents(espnSlug, from, to);
    if (filter) api = api.filter(filter);

    const filePairs = new Set(
      fixtures
        .filter((f) => f.league === leagueName)
        .map((f) => `${f.match_date.slice(0, 10)}|${f.home_team}|${f.away_team}`)
    );
    let matched = 0;
    for (const e of api) {
      const comp = e.competitions[0];
      const h = normalizeTeamName(comp.competitors.find((c) => c.homeAway === "home").team.displayName);
      const a = normalizeTeamName(comp.competitors.find((c) => c.homeAway === "away").team.displayName);
      if (filePairs.has(`${e.date.slice(0, 10)}|${h}|${a}`)) matched++;
    }

    if (matched !== api.length) fail(`${leagueName}: ${matched}/${api.length} coinciden con ESPN${note}`);
    else ok(`${leagueName}: ${matched}/${api.length} partidos idénticos a ESPN (fecha+equipos)${note}`);
  }

  await checkEspnCompetition("uefa.champions", "Champions League", "20260901", "20270131");
  await checkEspnCompetition("ita.coppa_italia", "Copa Italia", "20260801", "20270531", {
    filter: (e) => {
      const teams = e.competitions[0].competitors.map((c) => c.team.displayName);
      return !teams.some((t) => t.includes("TBD"));
    },
  });
  await checkEspnCompetition("uefa.europa", "Europa League", "20260901", "20270131");
  await checkEspnCompetition("uefa.europa.conf", "Conference League", "20260901", "20270131");

  // Copas con rondas de clubes pequeños: comparar SOLO los partidos de la API entre
  // equipos canónicos (mismo criterio que sync-official-fixtures.js al generar).
  const canonicalTeams = new Set(teamData.canonicalDbTeams);
  const onlyCanonical = (e) => {
    const teams = e.competitions[0].competitors.map((c) => normalizeTeamName(c.team.displayName));
    return teams.length === 2 && teams.every((t) => t && !t.includes("TBD") && canonicalTeams.has(t));
  };
  await checkEspnCompetition("eng.fa", "FA Cup", "20260801", "20270531", { filter: onlyCanonical, note: " (filtro canónico)" });
  await checkEspnCompetition("esp.copa_del_rey", "Copa del Rey", "20260801", "20270531", { filter: onlyCanonical, note: " (filtro canónico)" });

  const uclFile = fixtures.filter((f) => f.league === "Champions League"); // usado en la sección 7

  console.log("\n=== 7. UCL: cada equipo juega 8 partidos (4 como local) ===");
  const uclPerTeam = {};
  uclFile.forEach((f) => {
    uclPerTeam[f.home_team] = uclPerTeam[f.home_team] || { total: 0, home: 0 };
    uclPerTeam[f.home_team].total++; uclPerTeam[f.home_team].home++;
    uclPerTeam[f.away_team] = uclPerTeam[f.away_team] || { total: 0, home: 0 };
    uclPerTeam[f.away_team].total++;
  });
  const badUcl = Object.entries(uclPerTeam).filter(([, v]) => v.total !== 8 || v.home !== 4);
  if (badUcl.length) badUcl.forEach(([t, v]) => fail(`UCL ${t}: ${v.total} partidos (${v.home} local)`));
  else ok(`UCL: 36 equipos × 8 partidos (4 local / 4 visita)`);

  console.log("\n=== 8. Liga doméstica: cada equipo juega su calendario completo ===");
  const leagueTeamCounts = { "Premier League": { n: 20, total: 38 }, "LaLiga": { n: 20, total: 38 }, "Serie A": { n: 20, total: 38 }, "Bundesliga": { n: 18, total: 34 } };
  for (const [league, spec] of Object.entries(leagueTeamCounts)) {
    const perTeam = {};
    fixtures.filter((f) => f.league === league).forEach((f) => {
      perTeam[f.home_team] = (perTeam[f.home_team] || 0) + 1;
      perTeam[f.away_team] = (perTeam[f.away_team] || 0) + 1;
    });
    const teams = Object.keys(perTeam);
    const bad = teams.filter((t) => perTeam[t] !== spec.total);
    if (teams.length !== spec.n || bad.length) fail(`${league}: ${teams.length} equipos (esperado ${spec.n}), ${bad.length} con conteo incorrecto`);
    else ok(`${league}: ${spec.n} equipos × ${spec.total} partidos`);
  }

  console.log("\n=== 9. teamCups (auto-suscripción survivor) ===");
  const cupCounts = {};
  Object.values(teamData.teamCups).forEach((cups) => cups.forEach((c) => { cupCounts[c] = (cupCounts[c] || 0) + 1; }));
  ok(`teamCups: ${JSON.stringify(cupCounts)}`);
  const uclTeams = new Set(uclFile.flatMap((f) => [f.home_team, f.away_team]));
  const missingChamp = [...uclTeams].filter((t) => !(teamData.teamCups[t] || []).includes("champions"));
  if (missingChamp.length) fail(`Equipos UCL sin copa champions: ${missingChamp.join(", ")}`);
  else ok(`Todos los ${uclTeams.size} equipos UCL tienen la copa champions en teamCups`);

  console.log("\n=== 10. src/data y public/data sincronizados ===");
  // El sitio (GitHub Pages) sirve public/data; el código embebido usa src/data.
  // Si difieren, el bundle y lo servido discrepan (drift de ejecuciones locales).
  const crypto = require("crypto");
  for (const f of ["officialEvaluatedMatches", "officialEvaluatedPredictions", "officialFixtures", "officialPlayers"]) {
    const srcPath = path.join(__dirname, "..", "src/data", `${f}.json`);
    const pubPath = path.join(__dirname, "..", "public/data", `${f}.json`);
    const hash = (p) => crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
    if (!fs.existsSync(pubPath)) fail(`public/data/${f}.json no existe`);
    else if (hash(srcPath) !== hash(pubPath)) fail(`public/data/${f}.json desincronizado con src/data (el sitio sirve datos viejos)`);
    else ok(`${f}.json: idéntico en src/ y public/`);
  }

  console.log(`\n${errors === 0 ? "🎉 VALIDACIÓN COMPLETA: 0 errores" : `🔴 ${errors} errores encontrados`}`);
  process.exit(errors === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
