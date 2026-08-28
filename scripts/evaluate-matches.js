const { createClient } = require("@supabase/supabase-js");

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilkndkqcmxvlufxaugog.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa25ka3FjbXh2bHVmeGF1Z29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI5MTksImV4cCI6MjEwMzI2ODkxOX0.2AAajeD5mX0RxUXe1Fi5b_SefDBH5MClGKRXdIEZZcY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function normalizePlayerName(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeTeamName(name) {
  if (!name) return "";
  const cleaned = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b|\bcf\b|\bafc\b|\bssc\b|\bas\b|\bacf\b|\bss\b|\bus\b|\brc\b|\bcd\b|\bud\b|\brcd\b|\bca\b|\b1\.\b|\bvfb\b|\bvfl\b|\btsg\b|\bfsv\b|\bsv\b|\brb\b|\bbvb\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const aliasMap = {
    "bayernmunchen": "Bayern Munich",
    "bayern": "Bayern Munich",
    "stuttgart": "Stuttgart",
    "mancity": "Manchester City",
    "manchestercity": "Manchester City",
    "crystalpalace": "Crystal Palace",
    "acmilan": "AC Milan",
    "milan": "AC Milan",
    "venezia": "Venezia",
    "realbetis": "Real Betis",
    "betis": "Real Betis",
    "alaves": "Alavés",
    "deportivoalaves": "Alavés",
  };

  return aliasMap[cleaned] || name;
}

function calculateScore(prediction, real) {
  let pointsSign = 0;
  let pointsExactScore = 0;
  let pointsGoalDiff = 0;
  let pointsScorersName = 0;
  let pointsScorersQuantity = 0;
  const details = [];

  const predSign = Math.sign(prediction.home_score - prediction.away_score);
  const realSign = Math.sign(real.result_home - real.result_away);

  // 1. Sign (Resultado correcto: Local, Empate, Visitante) -> 3 pts
  const correctSign = predSign === realSign;
  if (correctSign) {
    pointsSign = 3;
    details.push("Resultado correcto (+3 pts)");
  }

  // 2. Exact Score (Marcador exacto) -> 2 pts
  const exactScore =
    prediction.home_score === real.result_home &&
    prediction.away_score === real.result_away;

  if (exactScore) {
    pointsExactScore = 2;
    details.push("Marcador exacto (+2 pts)");
  } else {
    // 3. Difference of 1 goal -> 1 pt
    const diffHome = Math.abs(prediction.home_score - real.result_home);
    const diffAway = Math.abs(prediction.away_score - real.result_away);
    const totalDiff = diffHome + diffAway;

    if (totalDiff === 1) {
      pointsGoalDiff = 1;
      details.push("Diferencia de 1 gol (+1 pt)");
    }
  }

  // 4 & 5. Scorers
  let scorersNameHits = 0;
  let scorersQuantityHits = 0;

  const realScorersMap = new Map();
  if (real.scorers) {
    for (const s of real.scorers) {
      const key = normalizePlayerName(s.player_name);
      realScorersMap.set(key, (realScorersMap.get(key) || 0) + (s.goals || 1));
    }
  }

  if (prediction.scorers && prediction.scorers.length > 0) {
    for (const predScorer of prediction.scorers.slice(0, 3)) {
      const normName = normalizePlayerName(predScorer.player_name);
      const actualGoals = realScorersMap.get(normName) || 0;

      if (actualGoals > 0) {
        scorersNameHits += 1;
        pointsScorersName += 1;
        details.push(`Goleador acertado: ${predScorer.player_name} (+1 pt)`);

        if (predScorer.goals === actualGoals) {
          scorersQuantityHits += 1;
          pointsScorersQuantity += 2;
          details.push(`Goles exactos de ${predScorer.player_name}: ${predScorer.goals} (+2 pts)`);
        }
      }
    }
  }

  const totalPoints =
    pointsSign +
    pointsExactScore +
    pointsGoalDiff +
    pointsScorersName +
    pointsScorersQuantity;

  return {
    totalPoints,
    correctSign,
    pointsSign,
    exactScore,
    pointsExactScore,
    goalDiffClose: pointsGoalDiff > 0,
    pointsGoalDiff,
    scorersNameHits,
    pointsScorersName,
    scorersQuantityHits,
    pointsScorersQuantity,
    details,
  };
}

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

    let targetMatch = (matches || []).find((m) => {
      const hNorm = normalizeTeamName(m.home_team).toLowerCase();
      const aNorm = normalizeTeamName(m.away_team).toLowerCase();
      const reqH = normalizeTeamName(homeTeamArg).toLowerCase();
      const reqA = normalizeTeamName(awayTeamArg).toLowerCase();
      return (hNorm.includes(reqH) || reqH.includes(hNorm)) && (aNorm.includes(reqA) || reqA.includes(aNorm));
    });

    if (targetMatch) {
      console.log(`✓ Partido encontrado: ${targetMatch.home_team} vs ${targetMatch.away_team} (ID: ${targetMatch.id})`);
      const { error: updErr } = await supabase
        .from("matches")
        .update({
          result_home: hScore,
          result_away: aScore,
        })
        .eq("id", targetMatch.id);

      if (updErr) {
        console.error("Error updating match in Supabase:", updErr);
      } else {
        console.log(`✓ Marcador actualizado en Supabase: ${hScore} - ${aScore}`);
      }
    } else {
      console.log(`⚠️ Partido no encontrado en tabla matches.`);
    }
  }

  console.log("\n=======================================================");
  console.log("Uso del script:");
  console.log('node scripts/evaluate-matches.js --home="Bayern Munich" --away="Stuttgart" --score="2-1" --scorers="Kane:1,Millot:1"');
  console.log("=======================================================\n");
}

main();
