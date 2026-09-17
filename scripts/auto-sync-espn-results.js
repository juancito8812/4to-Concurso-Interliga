const fs = require("fs");
const path = require("path");
const {
  normalizeTeamName,
  matchIdToUuid,
  calculateScore,
  isKnockoutMatch,
  isKnockoutCup,
  getKnockoutCupSlug,
  getEspnSlug,
  getKnockoutRound,
  evaluateSurvivorProgression,
  isPredictionOnTime,
} = require("./lib/score-utils");

const LEAGUE_SLUGS = [
  "esp.1",
  "eng.1",
  "ita.1",
  "ger.1",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
  "ita.coppa_italia",
  "eng.fa",
  "esp.copa_del_rey",
  "ger.dfb_pokal",
];

const LEAGUE_MAP = {
  "esp.1": "LaLiga",
  "eng.1": "Premier League",
  "ita.1": "Serie A",
  "ger.1": "Bundesliga",
  "uefa.champions": "Champions League",
  "uefa.europa": "Europa League",
  "uefa.europa.conf": "Conference League",
  "ita.coppa_italia": "Copa Italia",
  "eng.fa": "FA Cup",
  "esp.copa_del_rey": "Copa del Rey",
  "ger.dfb_pokal": "DFB-Pokal",
};

// Lecturas con la anon key (solo SELECT públicos por RLS).
// Si solo está disponible SERVICE_KEY, se usa como fallback para lecturas también.
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://ilkndkqcmxvlufxaugog.supabase.co").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Escrituras con la service role key (bypass RLS). Se inyecta como secreto de
// GitHub Actions (SUPABASE_SERVICE_ROLE_KEY) o variable de entorno local.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// --dry-run: hace todas las lecturas (ESPN + Supabase) y reporta exactamente lo que
// haría, sin escribir nada (ni en la base ni en los JSON). Sirve para validar cambios
// de reglas contra datos reales sin riesgo.
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || (!ANON_KEY && !SERVICE_KEY)) {
  throw new Error("Faltan credenciales de Supabase (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY)");
}

function authHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: authHeaders(ANON_KEY),
  });
  if (!res.ok) throw new Error(`supabase GET ${path} -> ${res.status}`);
  return res.json();
}

// PostgREST corta las respuestas en 1000 filas (max-rows del servidor): sin paginar,
// una tabla que crezca más allá de ese límite devolvería una vista truncada en
// silencio. No pasar rutas que ya incluyan limit/offset.
const PAGE_SIZE = 1000;
async function supabaseGetAll(path) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const sep = path.includes("?") ? "&" : "?";
    const page = await supabaseGet(`${path}${sep}limit=${PAGE_SIZE}&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function supabaseWrite(method, path, body, prefer) {
  if (!SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada (se requiere para escribir)");
  }
  if (DRY_RUN) {
    console.log(`🧪 [dry-run] ${method} ${path}`);
    return { ok: true, status: 204 };
  }
  const headers = authHeaders(SERVICE_KEY);
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`supabase ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res;
}

// Participaciones reiniciadas: el archivo oficial conserva los puntos de los pronósticos
// borrados (es el registro histórico y el respaldo de recuperación), así que un reinicio
// explícito — RPC reset_participation() o cambio de club — deja una marca en app_meta
// para que esas entradas se eliminen y el usuario quede realmente en 0 puntos.
// NO se purga nada por "fila ausente en la DB": un borrado accidental de la tabla debe
// poder recuperarse desde el archivo (ver DISASTER_RECOVERY_AND_SCHEMA.md).
async function purgeRevokedParticipations(officialPreds) {
  if (!SERVICE_KEY) return officialPreds;

  let markers = [];
  try {
    markers = await supabaseGetService("app_meta?select=key,value&key=like.revoked:*");
  } catch (e) {
    console.warn("⚠️  No se pudieron leer las marcas de revocación:", e.message);
    return officialPreds;
  }
  if (!Array.isArray(markers) || markers.length === 0) return officialPreds;

  const revokedAt = new Map();
  markers.forEach((m) => {
    const uid = String(m.key || "").replace("revoked:", "");
    const ts = new Date(m.value || 0).getTime();
    if (uid && ts) revokedAt.set(uid, ts);
  });
  if (revokedAt.size === 0) return officialPreds;

  const before = officialPreds.length;
  const kept = officialPreds.filter((p) => {
    const ts = revokedAt.get(p.user_id);
    if (!ts) return true;
    // Se purgan solo las entradas anteriores al reinicio; las posteriores son nuevas.
    const created = new Date(p.created_at || 0).getTime();
    return created > ts;
  });

  if (before !== kept.length) {
    console.log(`🧹 Participaciones reiniciadas: ${before - kept.length} entradas de puntos removidas del archivo oficial`);
  }

  for (const m of markers) {
    try {
      await supabaseWrite("DELETE", `app_meta?key=eq.${encodeURIComponent(m.key)}`);
    } catch (e) {
      console.warn(`No se pudo limpiar la marca ${m.key}:`, e.message);
    }
  }

  return kept;
}

// Lecturas internas con la service role key (tablas sin acceso anon como app_meta)
async function supabaseGetService(path) {
  if (!SERVICE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: authHeaders(SERVICE_KEY),
  });
  if (!res.ok) throw new Error(`supabase GET(service) ${path} -> ${res.status}`);
  return res.json();
}

// ESPN scoreboard solo devuelve un día por petición (?dates=YYYYMMDD);
// iteramos por los últimos BACKFILL_DAYS días para no perder resultados si el cron no corrió.
const BACKFILL_DAYS = 3;

function getDateList(days = BACKFILL_DAYS) {
  const dates = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates;
}

// Mantiene la tabla matches de Supabase alineada con el calendario oficial del repo.
// Solo sincroniza cuando el calendario cambió (hash en app_meta) para no re-escribir
// 1.842 filas en cada corrida del cron (~250KB x 12 corridas/día en el plan Free).
async function syncFixturesToSupabase(officialFixtures) {
  if (!SERVICE_KEY) {
    console.log("ℹ️  syncFixturesToSupabase saltado (no hay SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }
  try {
    const crypto = require("crypto");
    const hash = crypto.createHash("md5").update(JSON.stringify(officialFixtures)).digest("hex");

    const rows = await supabaseGetService("app_meta?key=eq.fixtures_hash&select=value");
    if (rows && rows.length > 0 && rows[0].value === hash) {
      return; // calendario sin cambios
    }

    const CHUNK = 300;
    for (let i = 0; i < officialFixtures.length; i += CHUNK) {
      const part = officialFixtures.slice(i, i + CHUNK).map((f) => ({
        id: f.id,
        home_team: f.home_team,
        away_team: f.away_team,
        match_date: f.match_date,
        league: f.league,
      }));
      await supabaseWrite("POST", `matches?on_conflict=id`, part, "resolution=merge-duplicates,return=minimal");
    }
    await supabaseWrite(
      "POST",
      "app_meta?on_conflict=key",
      [{ key: "fixtures_hash", value: hash }],
      "resolution=merge-duplicates,return=minimal"
    );
    console.log(`💾 Calendario sincronizado en Supabase matches: ${officialFixtures.length} fixtures`);
  } catch (e) {
    // fail-closed: si no se puede sincronizar el calendario, el run debe marcarse
    // como fallido (no terminar en silencio con datos desincronizados).
    throw new Error(`syncFixturesToSupabase falló: ${e.message}`);
  }
}

// Persiste resultados y puntos en Supabase con la service role key (REST directo).
// Las filas de matches ya usan los ids canónicos de los fixtures: se actualizan por
// id sin descargar la tabla completa (ahorra ~280KB por corrida).
async function persistToSupabase(officialMatches, officialPreds) {
  if (!SERVICE_KEY) {
    console.log("ℹ️  persistToSupabase saltado (no hay SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }
  try {
    // 1. Resultados de partidos: solo filas que aún no tienen resultado (PATCH por fila)
    const withResults = (officialMatches || []).filter(
      (m) => m.result_home !== null && m.result_home !== undefined
    );
    const ids = withResults.map((m) => m.id);
    let persisted = 0;
    if (ids.length > 0) {
      const existing = await supabaseGetAll(`matches?select=id&result_home=is.null&id=in.(${ids.join(",")})`);
      const pendingIds = new Set((existing || []).map((r) => r.id));
      for (const m of withResults) {
        if (!pendingIds.has(m.id)) continue;
        await supabaseWrite(
          "PATCH",
          `matches?id=eq.${m.id}`,
          { result_home: m.result_home, result_away: m.result_away }
        );
        persisted += 1;
      }
    }
    if (persisted > 0) {
      console.log(`💾 Resultados persistidos en Supabase matches: ${persisted}`);
    }

    // 2. Puntos de pronósticos: solo filas reales de la DB (PATCH por fila)
    const dbPreds = await supabaseGetAll("predictions?select=id,user_id,match_id");
    const dbByKey = new Map();
    (dbPreds || []).forEach((p) => dbByKey.set(`${p.user_id}|${p.match_id}`, p.id));

    let pointsPersisted = 0;
    for (const p of officialPreds) {
      if (p.points === undefined || p.points === null) continue;
      const dbId = dbByKey.get(`${p.user_id}|${p.match_id}`);
      if (!dbId) continue;
      await supabaseWrite("PATCH", `predictions?id=eq.${dbId}`, { points: p.points });
      pointsPersisted += 1;
    }
    if (pointsPersisted > 0) {
      console.log(`💾 Puntos persistidos en Supabase predictions: ${pointsPersisted}`);
    }
  } catch (e) {
    // fail-closed: la persistencia de resultados/puntos es el corazón del cron;
    // si falla, el run debe marcarse como fallido.
    throw new Error(`persistToSupabase falló: ${e.message}`);
  }
}

async function resolvePenaltyWinner(gameId, espnSlug) {
  if (!espnSlug) return null;
  try {
    const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/summary?event=${gameId}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const game = data?.gameInfo || data?.header?.competitions?.[0];
    if (!game) return null;

    const penalties = data?.penalties;
    if (penalties && Array.isArray(penalties)) {
      const winner = penalties.find((p) => p.winner);
      if (winner) return winner.team?.displayName || winner.team?.name || null;
    }

    const competitors = game.competitors || [];
    for (const c of competitors) {
      if (c.winner === true) {
        return c.team?.displayName || c.team?.name || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function evaluateSurvivors(finishedMatches) {
  if (!SERVICE_KEY) {
    console.log("ℹ️  evaluateSurvivors saltado (no hay SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }

  try {
    const [survivors, preds, teams] = await Promise.all([
      supabaseGetAll("tournament_survivors?select=id,user_id,tournament_slug,active_team_id,status,history,teams(name)"),
      supabaseGetAll("predictions?select=user_id,match_id,home_score,away_score"),
      supabaseGetAll("teams?select=id,name"),
    ]);

    const teamsByName = {};
    (teams || []).forEach((t) => {
      teamsByName[normalizeTeamName(t.name)] = t.id;
    });

    const finishedMap = new Map();
    for (const m of finishedMatches) {
      finishedMap.set(m.id, m);
      if (m.home_team && m.away_team) {
        finishedMap.set(`${m.home_team}-${m.away_team}`, m);
      }
    }

    const predsByUser = new Map();
    (preds || []).forEach((p) => {
      const arr = predsByUser.get(p.user_id) || [];
      arr.push(p);
      predsByUser.set(p.user_id, arr);
    });

    const updates = [];

    for (const sur of survivors || []) {
      if (sur.status !== "ALIVE") continue;
      const activeName = normalizeTeamName(sur.teams?.name || "");
      if (!activeName) continue;

      const history = Array.isArray(sur.history) ? sur.history : [];
      const doneMatches = new Set(history.map((h) => h.match_id));
      let current = { activeTeamId: sur.active_team_id, activeName, status: "ALIVE", history, roundName: "Ronda KO" };

      for (const p of predsByUser.get(sur.user_id) || []) {
        if (current.status !== "ALIVE") break;

        const match = finishedMap.get(p.match_id);
        if (!match) continue;
        if (!isKnockoutMatch(match.home_team, match.away_team, match.league, match.match_date)) continue;

        const mh = normalizeTeamName(match.home_team).toLowerCase();
        const ma = normalizeTeamName(match.away_team).toLowerCase();
        const an = current.activeName.toLowerCase();
        if (mh !== an && ma !== an) continue;
        if (doneMatches.has(match.id)) continue;

        if (p.home_score === p.away_score) continue;
        if (match.result_home === match.result_away) {
          const penWinner = await resolvePenaltyWinner(match.id, getEspnSlug(match.league));
          if (!penWinner) continue;
          match._penaltyWinner = penWinner;
        }

        const actualWinner = match._penaltyWinner || (match.result_home > match.result_away ? match.home_team : match.away_team);
        const predictedWinner = p.home_score > p.away_score ? match.home_team : match.away_team;
        const roundName = getKnockoutRound(match.match_date, getKnockoutCupSlug(match.league));

        const outcome = evaluateSurvivorProgression({
          activeTeamName: current.activeName,
          predictedWinner,
          actualWinner,
          matchId: match.id,
          roundName,
          matchDate: match.match_date,
          currentHistory: current.history,
        });

        if (!outcome.transferred && outcome.newStatus === "ALIVE") continue;
        doneMatches.add(match.id);

        let activeTeamId = current.activeTeamId;
        if (outcome.transferred) {
          activeTeamId = teamsByName[outcome.newTeamName] || activeTeamId;
        }
        current = {
          activeTeamId,
          activeName: outcome.newTeamName,
          status: outcome.newStatus,
          history: outcome.updatedHistory,
          roundName,
        };
        console.log(
          `🏆 Survivor ${sur.tournament_slug} (${sur.user_id}): ${outcome.newStatus}${outcome.transferred ? `, camiseta heredada: ${outcome.newTeamName}` : ""} en ${roundName}`
        );
      }

      const changed =
        current.activeTeamId !== sur.active_team_id ||
        current.status !== sur.status ||
        current.activeName !== activeName;
      if (changed) {
        updates.push({ id: sur.id, ...current });
      }
    }

    for (const u of updates) {
      await supabaseWrite(
        "PATCH",
        `tournament_survivors?id=eq.${u.id}`,
        {
          active_team_id: u.activeTeamId,
          status: u.status,
          eliminated_at_round: u.status === "ELIMINATED" ? u.roundName : null,
          history: u.history,
        }
      );
    }
    if (updates.length > 0) {
      console.log(`💾 Survivors actualizados en Supabase: ${updates.length}`);
    }
  } catch (e) {
    // fail-closed: la actualización de survivors escribe estado del torneo; si
    // falla, el run debe marcarse como fallido.
    throw new Error(`evaluateSurvivors falló: ${e.message}`);
  }
}

async function fetchSupabasePredictions() {
  try {
    const [preds, scorers, profiles] = await Promise.all([
      supabaseGetAll("predictions?select=id,user_id,match_id,home_score,away_score,created_at"),
      supabaseGetAll("prediction_scorers?select=prediction_id,player_name,goals,team"),
      supabaseGetAll("profiles?select=user_id,display_name"),
    ]);

    const scorersMap = {};
    (scorers || []).forEach((s) => {
      (scorersMap[s.prediction_id] = scorersMap[s.prediction_id] || []).push({
        player_name: s.player_name,
        goals: s.goals,
        team: s.team,
      });
    });

    const namesMap = {};
    (profiles || []).forEach((p) => {
      namesMap[p.user_id] = p.display_name || "Participante";
    });

    return (preds || []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: namesMap[p.user_id] || "Participante",
      match_id: p.match_id,
      home_score: p.home_score,
      away_score: p.away_score,
      created_at: p.created_at,
      scorers: scorersMap[p.id] || [],
    }));
  } catch (e) {
    console.warn("Could not fetch predictions from Supabase:", e.message);
    return [];
  }
}

function resolveMatchId(evId, fixture) {
  if (fixture) return matchIdToUuid(fixture.id);
  if (evId) return matchIdToUuid(evId);
  return null;
}

function findFixture(officialFixtures, homeName, awayName) {
  const hN = homeName.toLowerCase();
  const aN = awayName.toLowerCase();
  // Prefer exact normalized match
  let found = officialFixtures.find((f) => {
    const hF = normalizeTeamName(f.home_team).toLowerCase();
    const aF = normalizeTeamName(f.away_team).toLowerCase();
    return hF === hN && aF === aN;
  });
  if (found) return found;
  // Fallback to bidirectional substring
  return officialFixtures.find((f) => {
    const hF = normalizeTeamName(f.home_team).toLowerCase();
    const aF = normalizeTeamName(f.away_team).toLowerCase();
    return (
      (hF.includes(hN) || hN.includes(hF)) &&
      (aF.includes(aN) || aN.includes(aF))
    );
  });
}

async function autoSync() {
  console.log("=== SINCRONIZADOR AUTOMÁTICO DE RESULTADOS ESPN (4TO CONCURSO INTERLIGA) ===\n");

  const evalMatchesPath = path.join(__dirname, "../src/data/officialEvaluatedMatches.json");
  const evalPredsPath = path.join(__dirname, "../src/data/officialEvaluatedPredictions.json");
  const fixturesPath = path.join(__dirname, "../src/data/officialFixtures.json");

  let officialMatches = [];
  try {
    if (fs.existsSync(evalMatchesPath)) {
      officialMatches = JSON.parse(fs.readFileSync(evalMatchesPath, "utf8"));
    }
  } catch (e) {
    console.warn("Could not read officialEvaluatedMatches.json:", e.message);
  }

  let officialFixtures = [];
  try {
    if (fs.existsSync(fixturesPath)) {
      officialFixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
    }
  } catch (e) {
    console.warn("Could not read officialFixtures.json:", e.message);
  }

  let officialPreds = [];
  try {
    if (fs.existsSync(evalPredsPath)) {
      officialPreds = JSON.parse(fs.readFileSync(evalPredsPath, "utf8"));
    }
  } catch (e) {
    console.warn("Could not read officialEvaluatedPredictions.json:", e.message);
  }

  // Puntos de participantes que reiniciaron su participación (quedan en 0).
  officialPreds = await purgeRevokedParticipations(officialPreds);

  // ── Cierre de pronósticos (anti-farmeo de puntos) ────────────────────────────
  // La ventana de pronóstico (1 minuto antes del inicio) se aplicaba solo en el
  // cliente. Ahora el cron la valida con datos oficiales: un registro posterior
  // al cierre NUNCA puntúa, aunque se inserte por REST con la anon key.
  //
  // Excepción (grandfathering): los pronósticos ya archivados CON puntos son el
  // registro histórico oficial del concurso (backfills administrativos) y se
  // preservan tal cual. Solo se descartan registros nuevos fuera de plazo.
  const matchDateById = new Map();
  officialFixtures.forEach((f) => {
    // Se indexan ambas formas del id (UUID canónico y id crudo del fixture) porque
    // el archivo histórico puede contener cualquiera de las dos.
    matchDateById.set(matchIdToUuid(f.id), f.match_date);
    matchDateById.set(String(f.id), f.match_date);
  });
  officialMatches.forEach((m) => {
    if (!matchDateById.get(m.id) && m.match_date) matchDateById.set(m.id, m.match_date);
  });

  const keyOf = (p) => `${p.user_id}|${p.match_id}`;
  const archivedWithPoints = new Set(
    officialPreds.filter((p) => p.points !== null && p.points !== undefined).map(keyOf)
  );

  // Merge Supabase predictions (new predictions made in the app) into the evaluated record
  const supabasePreds = await fetchSupabasePredictions();
  const acceptedPreds = [];
  const rejectedLate = [];
  const rejectedKeys = new Set();

  for (const sp of supabasePreds) {
    const key = keyOf(sp);
    if (archivedWithPoints.has(key)) {
      acceptedPreds.push(sp);
      continue;
    }
    if (!isPredictionOnTime(sp.created_at, matchDateById.get(sp.match_id))) {
      rejectedKeys.add(key);
      rejectedLate.push(
        `${sp.display_name || sp.user_id} | ${sp.match_id} | registrado ${sp.created_at} | inicio ${matchDateById.get(sp.match_id) || "desconocido"}`
      );
      continue;
    }
    acceptedPreds.push(sp);
  }

  if (rejectedLate.length > 0) {
    console.warn(`\n🚫 Pronósticos fuera de plazo descartados (no puntúan): ${rejectedLate.length}`);
    rejectedLate.slice(0, 20).forEach((r) => console.warn(`   - ${r}`));
    const before = officialPreds.length;
    officialPreds = officialPreds.filter((p) => !rejectedKeys.has(keyOf(p)));
    if (before !== officialPreds.length) {
      console.warn(`🧹 Fuera de plazo removidos del archivo: ${before - officialPreds.length}`);
    }
  }

  for (const sp of acceptedPreds) {
    const idx = officialPreds.findIndex(
      (p) => p.user_id === sp.user_id && p.match_id === sp.match_id
    );
    if (idx >= 0) {
      officialPreds[idx] = { ...officialPreds[idx], ...sp };
    } else {
      officialPreds.push(sp);
    }
  }
  console.log(`📝 Pronósticos a evaluar: ${officialPreds.length} (JSON + ${supabasePreds.length} de Supabase, ${rejectedLate.length} fuera de plazo)`);

  let newResultsCount = 0;
  let failedFetches = 0;

  const dateList = getDateList(BACKFILL_DAYS);

  for (const slug of LEAGUE_SLUGS) {
    for (const dateStr of dateList) {
      try {
        const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateStr}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          failedFetches += 1;
          console.warn(`⚠️  [${slug}] ESPN devolvió HTTP ${res.status} (url: ${url})`);
          continue;
        }

        const data = await res.json();
        const events = data.events || [];

        for (const ev of events) {
          const isCompleted = ev.status?.type?.completed === true || ev.status?.type?.state === "post";
          const comp = ev.competitions?.[0];
          if (!comp || !isCompleted) continue;

          const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
          const awayComp = comp.competitors?.find((c) => c.homeAway === "away");

          if (!homeComp || !awayComp) continue;

          const homeName = normalizeTeamName(homeComp.team?.displayName || homeComp.team?.name || "");
          const awayName = normalizeTeamName(awayComp.team?.displayName || awayComp.team?.name || "");

          const scoreHome = parseInt(homeComp.score || "0", 10);
          const scoreAway = parseInt(awayComp.score || "0", 10);

          if (isNaN(scoreHome) || isNaN(scoreAway)) continue;

          // Parse scorers
          const scorersMap = {};
          if (comp.details && Array.isArray(comp.details)) {
            comp.details.forEach((d) => {
              if (d.scoringPlay && !d.ownGoal && d.athletesInvolved && Array.isArray(d.athletesInvolved)) {
                d.athletesInvolved.forEach((ath) => {
                  const playerName = ath.displayName || ath.fullName || ath.shortName;
                  if (playerName) {
                    const isHome = ath.team?.id === homeComp.team?.id;
                    const key = playerName.trim();
                    if (!scorersMap[key]) {
                      scorersMap[key] = { goals: 0, team: isHome ? "home" : "away" };
                    }
                    scorersMap[key].goals += 1;
                  }
                });
              }
            });
          }

          const scorers = Object.entries(scorersMap).map(([player_name, val]) => ({
            player_name,
            goals: val.goals,
            team: val.team,
          }));

          // Find match in official fixtures
          const fixture = findFixture(officialFixtures, homeName, awayName);
          const matchId = resolveMatchId(ev.id, fixture);
          if (!matchId) continue;

          const matchObj = {
            id: matchId,
            home_team: homeName,
            away_team: awayName,
            match_date: ev.date || comp.date || new Date().toISOString(),
            league: LEAGUE_MAP[slug] || "Fútbol",
            result_home: scoreHome,
            result_away: scoreAway,
            scorers,
            completed: true,
          };

          const existingIdx = officialMatches.findIndex(
            (m) =>
              (normalizeTeamName(m.home_team) === homeName && normalizeTeamName(m.away_team) === awayName) ||
              m.id === matchId
          );

          if (existingIdx >= 0) {
            officialMatches[existingIdx] = matchObj;
          } else {
            officialMatches.push(matchObj);
            newResultsCount += 1;
          }

          console.log(`✓ [${LEAGUE_MAP[slug]}] ${homeName} ${scoreHome} - ${scoreAway} ${awayName} (Goleadores: ${scorers.map(s => `${s.player_name} (${s.goals})`).join(", ") || "Ninguno"})`);
        }
      } catch (e) {
        failedFetches += 1;
        console.warn(`Error syncing slug ${slug} (${dateStr}):`, e.message);
      }
    }
  }

  // FAIL FAST: si ESPN rechazó TODAS las ligas, el cron no debe "tener éxito"
  // en silencio (como pasó con el cambio a 400 de las fechas separadas por coma).
  // Salir con código != 0 marca el run de GitHub Actions como fallido.
  if (failedFetches >= LEAGUE_SLUGS.length) {
    throw new Error(
      `FALLO CRÍTICO: ESPN devolvió error en todas las ${LEAGUE_SLUGS.length} ligas ` +
      `(${failedFetches} fallos). Verificar el formato de la URL/dates — probablemente ` +
      `ESPN cambió su API de nuevo. Ejemplo: ${LEAGUE_SLUGS[0]} -> HTTP error.`
    );
  }
  if (failedFetches > 0) {
    console.warn(`⚠️  ${failedFetches}/${LEAGUE_SLUGS.length} ligas fallaron, pero continuamos con el resto.`);
  }

  // Save official evaluated matches
  if (DRY_RUN) {
    console.log(`\n🧪 [dry-run] No se escribió ${path.basename(evalMatchesPath)} (${officialMatches.length} partidos finalizados)`);
  } else {
    fs.writeFileSync(evalMatchesPath, JSON.stringify(officialMatches, null, 2), "utf8");
    console.log(`\n💾 Total de partidos finalizados guardados: ${officialMatches.length}`);
  }

  // Re-evaluate predictions
  console.log("\n📊 CALCULANDO PUNTOS DE PARTICIPANTES AUTOMÁTICAMENTE:");
  let totalPointsDistributed = 0;

  officialPreds.forEach((pred) => {
    let match = officialMatches.find((m) => m.id === pred.match_id);

    // Fallback: join by fixture team names when the prediction id is orphaned
    if (!match) {
      const fixture = officialFixtures.find(
        (f) => matchIdToUuid(f.id) === pred.match_id || String(f.id) === pred.match_id
      );
      if (fixture) {
        const fh = normalizeTeamName(fixture.home_team).toLowerCase();
        const fa = normalizeTeamName(fixture.away_team).toLowerCase();
        match = officialMatches.find((m) => {
          const mh = normalizeTeamName(m.home_team).toLowerCase();
          const ma = normalizeTeamName(m.away_team).toLowerCase();
          return (mh === fh && ma === fa) || (mh.includes(fh) && ma.includes(fa));
        });
      }
    }

    if (match && match.result_home !== null && match.result_away !== null) {
      // Blindaje final: nunca puntuar un pronóstico registrado después del cierre
      // (el archivo oficial con puntos ya concedidos queda grandfathereado).
      if (
        !archivedWithPoints.has(keyOf(pred)) &&
        !isPredictionOnTime(pred.created_at, matchDateById.get(pred.match_id))
      ) {
        console.warn(`🚫 Sin puntaje (fuera de plazo): ${pred.display_name || pred.user_id} en ${match.home_team} vs ${match.away_team}`);
        return;
      }

      const score = calculateScore(
        {
          home_score: pred.home_score,
          away_score: pred.away_score,
          scorers: pred.scorers || [],
        },
        {
          result_home: match.result_home,
          result_away: match.result_away,
          scorers: match.scorers || [],
        }
      );

      pred.points = score.totalPoints;
      pred.pointsDetails = score.details;
      totalPointsDistributed += score.totalPoints;

      console.log(`👤 ${pred.display_name || "Participante"}: ${score.totalPoints} PTS en ${match.home_team} vs ${match.away_team} -> ${score.details.join(" | ")}`);
    }
  });

  if (DRY_RUN) {
    console.log(`\n🧪 [dry-run] No se escribió ${path.basename(evalPredsPath)} (${officialPreds.length} pronósticos)`);
  } else {
    fs.writeFileSync(evalPredsPath, JSON.stringify(officialPreds, null, 2), "utf8");
  }
  console.log(
    `\n🎉 SINCRONIZACIÓN ${DRY_RUN ? "SIMULADA (dry-run)" : "AUTOMÁTICA COMPLETADA"} EXITOSAMENTE! (Puntos distribuidos: ${totalPointsDistributed} pts)`
  );

  await syncFixturesToSupabase(officialFixtures);
  await persistToSupabase(officialMatches, officialPreds);
  await evaluateSurvivors(officialMatches);
}

autoSync();
