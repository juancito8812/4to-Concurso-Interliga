const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const {
  normalizeTeamName,
  matchIdToUuid,
  calculateScore,
} = require("./lib/score-utils");

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilkndkqcmxvlufxaugog.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa25ka3FjbXh2bHVmeGF1Z29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI5MTksImV4cCI6MjEwMzI2ODkxOX0.2AAajeD5mX0RxUXe1Fi5b_SefDBH5MClGKRXdIEZZcY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== EVALUADOR DE PARTIDOS Y PUNTUACIÓN - 4TO CONCURSO INTERLIGA ===\n");

  const args = process.argv.slice(2);
  let homeTeamArg = "";
  let awayTeamArg = "";
  let scoreArg = "";
  let scorersArg = "";

  args.forEach((arg) => {
    if (arg.startsWith("--home=")) homeTeamArg = arg.split("=")[1];
    if (arg.startsWith("--away=")) awayTeamArg = arg.split("=")[1];
    if (arg.startsWith("--score=")) scoreArg = arg.split("=")[1];
    if (arg.startsWith("--scorers=")) scorersArg = arg.split("=")[1];
  });

  // 1. Fetch current profiles
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id, display_name");
  if (pErr) {
    console.error("Error fetching profiles:", pErr);
    return;
  }
  const profilesMap = {};
  (profiles || []).forEach((p) => {
    profilesMap[p.user_id] = p.display_name || "Participante";
  });

  // 2. Fetch current predictions
  const { data: preds, error: predErr } = await supabase.from("predictions").select("*");
  if (predErr) {
    console.error("Error fetching predictions:", predErr);
    return;
  }

  console.log(`📊 Participantes registrados: ${profiles.length}`);
  console.log(`📝 Pronósticos en base de datos: ${preds.length}\n`);

  // 3. Fetch matches from Supabase
  const { data: matches, error: mErr } = await supabase.from("matches").select("*");
  if (mErr) {
    console.error("Error fetching matches:", mErr);
    return;
  }

  const evaluatedMatches = (matches || []).filter((m) => m.result_home !== null && m.result_away !== null);
  console.log(`⚽ Partidos en DB: ${matches.length} (Evaluados con resultado: ${evaluatedMatches.length})`);

  if (evaluatedMatches.length > 0) {
    console.log("\n📋 Partidos evaluados actualmente:");
    evaluatedMatches.forEach((m) => {
      console.log(`  - [${m.league}] ${m.home_team} ${m.result_home} - ${m.result_away} ${m.away_team} (ID: ${m.id})`);
    });
  }

  if (homeTeamArg && awayTeamArg && scoreArg) {
    const [hScore, aScore] = scoreArg.split("-").map((s) => parseInt(s.trim(), 10));
    console.log(`\n🎯 Evaluando resultado: ${homeTeamArg} ${hScore} - ${aScore} ${awayTeamArg}...`);

    const parsedScorers = [];
    if (scorersArg) {
      scorersArg.split(",").forEach((s) => {
        const [pName, pGoals] = s.split(":");
        if (pName) {
          parsedScorers.push({
            player_name: pName.trim(),
            goals: parseInt(pGoals || "1", 10),
          });
        }
      });
    }

    const fs = require("fs");
    const path = require("path");
    const evalMatchesPath = path.join(__dirname, "../src/data/officialEvaluatedMatches.json");
    const evalPredsPath = path.join(__dirname, "../src/data/officialEvaluatedPredictions.json");
    const fixturesPath = path.join(__dirname, "../src/data/officialFixtures.json");

    let officialMatches = [];
    try {
      if (fs.existsSync(evalMatchesPath)) {
        officialMatches = JSON.parse(fs.readFileSync(evalMatchesPath, "utf8"));
      }
    } catch (e) {
      console.warn("Could not read officialEvaluatedMatches.json:", e);
    }

    let officialFixtures = [];
    try {
      if (fs.existsSync(fixturesPath)) {
        officialFixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8"));
      }
    } catch (e) {
      console.warn("Could not read officialFixtures.json:", e);
    }

    const normReqH = normalizeTeamName(homeTeamArg);
    const normReqA = normalizeTeamName(awayTeamArg);

    let targetMatch = (matches || []).find((m) => {
      const hNorm = normalizeTeamName(m.home_team).toLowerCase();
      const aNorm = normalizeTeamName(m.away_team).toLowerCase();
      const reqH = normReqH.toLowerCase();
      const reqA = normReqA.toLowerCase();
      return (hNorm.includes(reqH) || reqH.includes(hNorm)) && (aNorm.includes(reqA) || reqA.includes(aNorm));
    });

    // Canonical id: fixture-based first, then Supabase row, otherwise abort (never guess)
    const fixture = officialFixtures.find((f) => {
      const hNorm = normalizeTeamName(f.home_team).toLowerCase();
      const aNorm = normalizeTeamName(f.away_team).toLowerCase();
      const reqH = normReqH.toLowerCase();
      const reqA = normReqA.toLowerCase();
      return (hNorm.includes(reqH) || reqH.includes(hNorm)) && (aNorm.includes(reqA) || reqA.includes(aNorm));
    });

    const matchId = fixture ? matchIdToUuid(fixture.id) : targetMatch?.id;

    if (!matchId) {
      console.error(`⚠️ Partido ${normReqH} vs ${normReqA} no encontrado en Supabase ni en officialFixtures.json.`);
      console.error("   Abortando sin escribir para evitar un ID incorrecto.");
      return;
    }

    const matchObj = {
      id: matchId,
      home_team: normReqH,
      away_team: normReqA,
      match_date: targetMatch ? targetMatch.match_date : new Date().toISOString(),
      league: targetMatch ? targetMatch.league : "Serie A",
      result_home: hScore,
      result_away: aScore,
      scorers: parsedScorers,
    };

    // Upsert into officialEvaluatedMatches.json
    const existingIdx = officialMatches.findIndex(
      (m) =>
        (normalizeTeamName(m.home_team) === normReqH && normalizeTeamName(m.away_team) === normReqA) ||
        m.id === matchObj.id
    );

    if (existingIdx >= 0) {
      officialMatches[existingIdx] = matchObj;
    } else {
      officialMatches.push(matchObj);
    }

    fs.writeFileSync(evalMatchesPath, JSON.stringify(officialMatches, null, 2), "utf8");
    console.log(`✓ Resultado guardado en src/data/officialEvaluatedMatches.json`);

    // Calculate predictions points
    let officialPreds = [];
    try {
      if (fs.existsSync(evalPredsPath)) {
        officialPreds = JSON.parse(fs.readFileSync(evalPredsPath, "utf8"));
      }
    } catch (e) {
      console.warn("Could not read officialEvaluatedPredictions.json:", e);
    }

    console.log("\n📊 CALCULANDO PUNTOS PARA PARTICIPANTES:");
    const matchPredictions = officialPreds.filter((p) => p.match_id === matchObj.id);

    if (matchPredictions.length === 0) {
      console.log("No hay pronósticos registrados para este partido aún.");
    } else {
      matchPredictions.forEach((p) => {
        const score = calculateScore(
          {
            home_score: p.home_score,
            away_score: p.away_score,
            scorers: p.scorers || [],
          },
          {
            result_home: hScore,
            result_away: aScore,
            scorers: parsedScorers,
          }
        );
        console.log(`\n👤 Participante: ${p.display_name || p.user_id}`);
        console.log(`   Pronóstico: ${p.home_score} - ${p.away_score}`);
        console.log(`   Total ganado: +${score.totalPoints} PTS`);
        console.log(`   Desglose: ${score.details.join(" | ")}`);
      });
    }
  }

  console.log("\n=======================================================");
  console.log("Uso del script:");
  console.log('node scripts/evaluate-matches.js --home="Bayern Munich" --away="Stuttgart" --score="2-1" --scorers="Kane:1,Millot:1"');
  console.log("=======================================================\n");
}

main();
