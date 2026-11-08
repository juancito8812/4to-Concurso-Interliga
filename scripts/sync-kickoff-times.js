#!/usr/bin/env node
/**
 * sync-kickoff-times.js — Refresca la hora real de inicio (kickoff) desde ESPN.
 *
 * Problema que resuelve: football-data.org devuelve 00:00:00Z mientras la TV no
 * confirma horario, y los partidos reprogramados (TV) no se reflejan solos.
 * Eso provoca (a) falsas alarmas de "resultados pendientes" en el admin y
 * (b) ventanas donde se puede pronosticar después del pitazo inicial.
 *
 * Ventana: últimos 14 días y próximos 10 (más allá, ESPN también devuelve
 * 20:00Z de relleno, así que no se toca y manda effective_kickoff() en DB).
 *
 * Uso:
 *   node scripts/sync-kickoff-times.js            # dry-run (solo reporte)
 *   node scripts/sync-kickoff-times.js --write    # escribe JSON + Supabase
 *
 * Requiere para --write: SUPABASE_SERVICE_ROLE_KEY (o lo lee de .env.local)
 */
const fs = require("fs");
const path = require("path");
const { normalizeTeamName } = require("./lib/score-utils.js");

const ROOT = path.join(__dirname, "..");
const SRC_JSON = path.join(ROOT, "src", "data", "officialFixtures.json");
const PUB_JSON = path.join(ROOT, "public", "data", "officialFixtures.json");

const WRITE = process.argv.includes("--write");
const MIN_DELTA_MIN = 30; // ignora diferencias menores (redondeos de fuente)
const PAST_DAYS = 14;
const FUTURE_DAYS = 10; // ESPN pone 20:00Z de relleno más allá de ~2 semanas
const CONCURRENCY = 8;

const COMPETITIONS = {
  "Premier League": "eng.1",
  LaLiga: "esp.1",
  "Serie A": "ita.1",
  Bundesliga: "ger.1",
  "Champions League": "uefa.champions",
  "Europa League": "uefa.europa",
  "Conference League": "uefa.europa.conf",
  "Copa Italia": "ita.coppa_italia",
  "FA Cup": "eng.fa",
  "Copa del Rey": "esp.copa_del_rey",
  "DFB-Pokal": "ger.dfb_pokal",
};

function loadEnv() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, "").trim();
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  }
}

const dayKey = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const normKey = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

async function fetchScoreboard(slug, yyyymmdd) {
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${yyyymmdd}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  loadEnv();
  const raw = fs.readFileSync(SRC_JSON, "utf8");
  const fixtures = JSON.parse(raw);
  const now = Date.now();
  const from = now - PAST_DAYS * 86400000;
  const to = now + FUTURE_DAYS * 86400000;

  // 1. Fixtures dentro de la ventana y con liga cubierta
  const targets = fixtures.filter((f) => {
    if (!COMPETITIONS[f.league]) return false;
    const t = new Date(f.match_date).getTime();
    return t >= from && t <= to;
  });
  console.log(`fixtures en ventana: ${targets.length} de ${fixtures.length}`);

  // 2. Días ESPN a consultar por liga (rango de los fixtures de esa liga ±1 día)
  const byLeague = {};
  for (const f of targets) (byLeague[f.league] ||= []).push(f);

  const espnIndex = new Map(); // "lg|home|away" -> event
  const espnById = new Map(); // uuid-ish espn id -> event

  for (const [league, list] of Object.entries(byLeague)) {
    const slug = COMPETITIONS[league];
    const times = list.map((f) => new Date(f.match_date).getTime());
    const start = new Date(Math.min(...times) - 86400000);
    const end = new Date(Math.max(...times) + 86400000);
    const days = [];
    for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); d <= end; d = new Date(d.getTime() + 86400000)) {
      days.push(dayKey(d));
    }
    const results = await mapLimit(days, CONCURRENCY, (d) => fetchScoreboard(slug, d));
    let count = 0;
    for (const evs of results) {
      for (const e of evs) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        const homeC = comp.competitors?.find((c) => c.homeAway === "home");
        const awayC = comp.competitors?.find((c) => c.homeAway === "away");
        if (!homeC || !awayC) continue;
        const home = normalizeTeamName(homeC.team?.displayName || homeC.team?.name || "");
        const away = normalizeTeamName(awayC.team?.displayName || awayC.team?.name || "");
        const key = `${league}|${normKey(home)}|${normKey(away)}`;
        if (!espnIndex.has(key)) espnIndex.set(key, []);
        espnIndex.get(key).push({ date: e.date, state: comp.status?.type?.state, id: e.id, home, away });
        count++;
      }
    }
    console.log(`  ${league}: ${days.length} días ESPN → ${count} eventos`);
  }

  // 3. Emparejar y decidir cambios
  const changes = [];
  const unmatched = [];
  for (const f of targets) {
    const key = `${f.league}|${normKey(f.home_team)}|${normKey(f.away_team)}`;
    const cands = (espnIndex.get(key) || []).slice().sort(
      (a, b) => Math.abs(new Date(a.date) - new Date(f.match_date)) - Math.abs(new Date(b.date) - new Date(f.match_date))
    );
    const ev = cands[0];
    if (!ev) {
      unmatched.push(f);
      continue;
    }
    const deltaMin = (new Date(ev.date) - new Date(f.match_date)) / 60000;
    if (Math.abs(deltaMin) < MIN_DELTA_MIN) continue;
    // salvaguarda: no aceptar un evento a más de 10 días (posible otro partido)
    if (Math.abs(deltaMin) > 10 * 24 * 60) {
      unmatched.push(f);
      continue;
    }
    changes.push({ f, ev, deltaMin });
  }

  changes.sort((a, b) => new Date(a.f.match_date) - new Date(b.f.match_date));
  console.log(`\nCAMBIOS: ${changes.length} | sin evento ESPN: ${unmatched.length}\n`);
  for (const { f, ev, deltaMin } of changes) {
    const st = new Date(f.match_date);
    const nt = new Date(ev.date);
    console.log(
      `${f.league.padEnd(16)} ${f.home_team} vs ${f.away_team}\n` +
        `   ${st.toISOString().slice(0, 16)}Z → ${nt.toISOString().slice(0, 16)}Z  (${deltaMin > 0 ? "+" : ""}${deltaMin.toFixed(0)} min)${ev.state ? " [" + ev.state + "]" : ""}`
    );
  }
  if (unmatched.length) {
    console.log("\nSIN EVENTO ESPN (se deja la fecha actual):");
    for (const f of unmatched.slice(0, 25)) console.log(`  ${f.league} | ${f.home_team} vs ${f.away_team} | ${f.match_date}`);
    if (unmatched.length > 25) console.log(`  … y ${unmatched.length - 25} más`);
  }

  if (!WRITE) {
    console.log("\nDRY-RUN. Para aplicar: node scripts/sync-kickoff-times.js --write");
    return;
  }
  if (!changes.length) return;

  // 4. Escribir JSON (src + public), mantener orden por fecha
  const map = new Map(changes.map(({ f, ev }) => [f.id, new Date(ev.date).toISOString().replace(".000Z", "Z")]));
  for (const f of fixtures) if (map.has(f.id)) f.match_date = map.get(f.id);
  const out = JSON.stringify(fixtures, null, 2) + "\n";
  fs.writeFileSync(SRC_JSON, out);
  fs.mkdirSync(path.dirname(PUB_JSON), { recursive: true });
  fs.writeFileSync(PUB_JSON, out);
  console.log(`\nJSON actualizado: src/data + public/data (${changes.length} fechas)`);

  // 5. Supabase REST
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!KEY || !URL) {
    console.warn("Sin SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL: solo JSON actualizado.");
    return;
  }
  let ok = 0;
  const fails = [];
  for (const { f, ev } of changes) {
    const body = { match_date: new Date(ev.date).toISOString() };
    const r = await fetch(`${URL}/rest/v1/matches?id=eq.${encodeURIComponent(f.id)}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body),
    });
    if (r.ok) ok++;
    else fails.push(`${f.home_team} vs ${f.away_team}: HTTP ${r.status}`);
  }
  console.log(`Supabase matches.match_date actualizado: ${ok}/${changes.length}`);
  if (fails.length) console.log("Fallos:\n  " + fails.slice(0, 10).join("\n  "));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
