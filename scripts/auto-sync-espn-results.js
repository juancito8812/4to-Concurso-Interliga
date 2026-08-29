const fs = require("fs");
const path = require("path");
const {
  normalizeTeamName,
  matchIdToUuid,
  calculateScore,
  isKnockoutMatch,
  evaluateSurvivorProgression,
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
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilkndkqcmxvlufxaugog.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa25ka3FjbXh2bHVmeGF1Z29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI5MTksImV4cCI6MjEwMzI2ODkxOX0.2AAajeD5mX0RxUXe1Fi5b_SefDBH5MClGKRXdIEZZcY";

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`supabase GET ${path} -> ${res.status}`);
  return res.json();
}

async function callRpc(name, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`rpc ${name} -> ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ESPN scoreboard solo devuelve el día actual; con ?dates=YYYYMMDD,.. retrocedemos
// hasta BACKFILL_DAYS días para no perder resultados si el cron no corrió un día.
const BACKFILL_DAYS = 3;

function datesParam() {
  const dates = [];
  for (let i = 0; i <= BACKFILL_DAYS; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates.join(",");
}

// Mantiene la tabla matches de Supabase alineada con el calendario oficial del repo.
// Solo sincroniza cuando el calendario cambió (hash en app_meta) para no re-escribir
// 1.842 filas en cada corrida del cron (~250KB x 12 corridas/día en el plan Free).
async function syncFixturesToSupabase(officialFixtures) {
  try {
    const crypto = require("crypto");
    const hash = crypto.createHash("md5").update(JSON.stringify(officialFixtures)).digest("hex");

    const prevHash = await callRpc("get_meta", { p_key: "fixtures_hash" }).catch(() => null);
    if (prevHash && prevHash.trim() === hash) {
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
      await callRpc("upsert_fixture_matches", { p_fixtures: part });
    }
    await callRpc("set_meta", { p_key: "fixtures_hash", p_value: hash });
    console.log(`💾 Calendario sincronizado en Supabase matches: ${officialFixtures.length} fixtures`);
  } catch (e) {
    console.warn("Could not sync fixtures to Supabase:", e.message);
  }
}

// Evaluación automática de la mecánica de Superviviente en copas KO.
// Solo se procesan partidos de los emparejamientos oficiales (isKnockoutMatch),
// idempotente por match_id en history. Persiste vía RPC SECURITY DEFINER.
async function evaluateSurvivors(officialMatches) {
  try {
    const [survivors, preds, teamsData] = await Promise.all([
      supabaseGet("tournament_survivors?select=id,user_id,tournament_slug,active_team_id,status,history,teams(name)"),
      supabaseGet("predictions?select=user_id,match_id,home_score,away_score"),
      supabaseGet("teams?select=id,name"),
    ]);

    const teamsByName = {};
    (teamsData || []).forEach((t) => {
      teamsByName[normalizeTeamName(t.name)] = t.id;
    });

    const finishedMap = new Map();
    for (const m of officialMatches) {
      if (m.result_home !== null && m.result_home !== undefined) {
        finishedMap.set(m.id, m);
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
      let current = { activeTeamId: sur.active_team_id, activeName, status: "ALIVE", history };

      for (const p of predsByUser.get(sur.user_id) || []) {
        if (current.status !== "ALIVE") break;

        const match = finishedMap.get(p.match_id);
        if (!match) continue;
        if (!isKnockoutMatch(match.home_team, match.away_team, match.league)) continue;

        const mh = normalizeTeamName(match.home_team).toLowerCase();
        const ma = normalizeTeamName(match.away_team).toLowerCase();
        const an = current.activeName.toLowerCase();
        if (mh !== an && ma !== an) continue;
        if (doneMatches.has(match.id)) continue;
        if (match.result_home === match.result_away || p.home_score === p.away_score) continue;

        const actualWinner = match.result_home > match.result_away ? match.home_team : match.away_team;
        const predictedWinner = p.home_score > p.away_score ? match.home_team : match.away_team;

        const outcome = evaluateSurvivorProgression({
          activeTeamName: current.activeName,
          predictedWinner,
          actualWinner,
          matchId: match.id,
          roundName: "Ronda KO",
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
        };
        console.log(
          `🏆 Survivor ${sur.tournament_slug} (${sur.user_id}): ${outcome.newStatus}${outcome.transferred ? `, camiseta heredada: ${outcome.newTeamName}` : ""}`
        );
      }

      const changed =
        current.activeTeamId !== sur.active_team_id ||
        current.status !== sur.status ||
        current.activeName !== activeName;
      if (changed) {
        updates.push({
          id: sur.id,
          active_team_id: current.activeTeamId,
          status: current.status,
          eliminated_at_round: current.status === "ELIMINATED" ? "Ronda KO" : "",
          history: current.history,
        });
      }
    }

    if (updates.length > 0) {
      await callRpc("update_survivors", { p_updates: updates });
      console.log(`💾 Survivors actualizados en Supabase: ${updates.length}`);
    }
  } catch (e) {
    console.warn("Could not evaluate survivors:", e.message);
  }
}

// Persiste resultados y puntos en Supabase vía RPC SECURITY DEFINER (no requiere sesión)
// Las filas de matches ya usan los ids canónicos de los fixtures, así que se actualizan
// por id directamente sin descargar la tabla completa (ahorra ~280KB por corrida).
async function persistToSupabase(officialMatches, officialPreds) {
  try {
    // 1. Resultados de partidos: actualización directa por id (el RPC solo escribe filas sin resultado)
    const resultUpdates = (officialMatches || [])
      .filter((m) => m.result_home !== null && m.result_home !== undefined)
      .map((m) => ({ id: m.id, result_home: m.result_home, result_away: m.result_away }));

    if (resultUpdates.length > 0) {
      await callRpc("update_match_results", { p_updates: resultUpdates });
      console.log(`💾 Resultados persistidos en Supabase matches: ${resultUpdates.length}`);
    }

    // 2. Puntos de pronósticos: solo filas reales de la DB (ids uuid de supabase)
    const dbPreds = await supabaseGet("predictions?select=id,user_id,match_id");
    const dbByKey = new Map();
    (dbPreds || []).forEach((p) => dbByKey.set(`${p.user_id}|${p.match_id}`, p.id));

    const predUpdates = [];
    for (const p of officialPreds) {
      if (p.points === undefined || p.points === null) continue;
      const dbId = dbByKey.get(`${p.user_id}|${p.match_id}`);
      if (dbId) {
        predUpdates.push({ id: dbId, points: p.points });
      }
    }
    if (predUpdates.length > 0) {
      await callRpc("update_prediction_points", { p_updates: predUpdates });
      console.log(`💾 Puntos persistidos en Supabase predictions: ${predUpdates.length}`);
    }
  } catch (e) {
    console.warn("Could not persist to Supabase:", e.message);
  }
}

async function fetchSupabasePredictions() {
  try {
    const [preds, scorers, profiles] = await Promise.all([
      supabaseGet("predictions?select=id,user_id,match_id,home_score,away_score"),
      supabaseGet("prediction_scorers?select=prediction_id,player_name,goals,team"),
      supabaseGet("profiles?select=user_id,display_name"),
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
      scorers: scorersMap[p.id] || [],
    }));
  } catch (e) {
    console.warn("Could not fetch predictions from Supabase:", e.message);
    return [];
  }
}

function resolveMatchId(evId, fixture) {
  if (fixture) return matchIdToUuid(fixture.id);
  return matchIdToUuid(evId || "unknown");
}

function findFixture(officialFixtures, homeName, awayName) {
  return officialFixtures.find((f) => {
    const hF = normalizeTeamName(f.home_team).toLowerCase();
    const aF = normalizeTeamName(f.away_team).toLowerCase();
    const hN = homeName.toLowerCase();
    const aN = awayName.toLowerCase();
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

  // Merge Supabase predictions (new predictions made in the app) into the evaluated record
  const supabasePreds = await fetchSupabasePredictions();
  for (const sp of supabasePreds) {
    const idx = officialPreds.findIndex(
      (p) => p.user_id === sp.user_id && p.match_id === sp.match_id
    );
    if (idx >= 0) {
      officialPreds[idx] = { ...officialPreds[idx], ...sp };
    } else {
      officialPreds.push(sp);
    }
  }
  console.log(`📝 Pronósticos a evaluar: ${officialPreds.length} (JSON + ${supabasePreds.length} de Supabase)`);

  let newResultsCount = 0;

  for (const slug of LEAGUE_SLUGS) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${datesParam()}`;
      const res = await fetch(url);
      if (!res.ok) continue;

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

        const scoreHome = parseInt(homeComp.score, 10);
        const scoreAway = parseInt(awayComp.score, 10);

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
      console.warn(`Error syncing slug ${slug}:`, e.message);
    }
  }

  // Save official evaluated matches
  fs.writeFileSync(evalMatchesPath, JSON.stringify(officialMatches, null, 2), "utf8");
  console.log(`\n💾 Total de partidos finalizados guardados: ${officialMatches.length}`);

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

  fs.writeFileSync(evalPredsPath, JSON.stringify(officialPreds, null, 2), "utf8");
  console.log(`\n🎉 ¡SINCRONIZACIÓN AUTOMÁTICA COMPLETADA EXITOSAMENTE! (Puntos distribuidos: ${totalPointsDistributed} pts)`);

  await syncFixturesToSupabase(officialFixtures);
  await persistToSupabase(officialMatches, officialPreds);
  await evaluateSurvivors(officialMatches);
}

autoSync();
