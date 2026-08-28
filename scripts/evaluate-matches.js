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

function cleanPhonetic(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[czs]/g, "s")
    .replace(/[yi]/g, "i")
    .replace(/[bv]/g, "b")
    .replace(/[^a-z0-9]/g, "");
}

function arePlayersMatching(nameA, nameB) {
  const normA = normalizePlayerName(nameA);
  const normB = normalizePlayerName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const cleanA = cleanPhonetic(normA);
  const cleanB = cleanPhonetic(normB);
  if (cleanA === cleanB) return true;

  const wordsA = normA.split(/[\s.-]+/).filter((w) => w.length > 0);
  const wordsB = normB.split(/[\s.-]+/).filter((w) => w.length > 0);

  if (wordsA.length === 1 || wordsB.length === 1) {
    const single = wordsA.length === 1 ? wordsA[0] : wordsB[0];
    const multi = wordsA.length === 1 ? wordsB : wordsA;
    if (single.length >= 3) {
      const cleanSingle = cleanPhonetic(single);
      return multi.some((w) => {
        const cleanW = cleanPhonetic(w);
        return cleanW === cleanSingle || (cleanSingle.length >= 5 && (cleanW.includes(cleanSingle) || cleanSingle.includes(cleanW)));
      });
    }
  }

  const lastA = cleanPhonetic(wordsA[wordsA.length - 1]);
  const lastB = cleanPhonetic(wordsB[wordsB.length - 1]);
  const firstA = cleanPhonetic(wordsA[0]);
  const firstB = cleanPhonetic(wordsB[0]);

  if (lastA === lastB) {
    if (firstA === firstB) return true;
    if (firstA[0] === firstB[0] && (firstA.length === 1 || firstB.length === 1)) return true;
    if (firstA.length >= 4 && firstB.length >= 4 && (firstA.includes(firstB) || firstB.includes(firstA))) return true;
    return false;
  }

  return false;
}

  // 4 & 5. Scorers
  let scorersNameHits = 0;
  let scorersQuantityHits = 0;

  const realScorersList = real.scorers || [];

  if (prediction.scorers && prediction.scorers.length > 0) {
    for (const predScorer of prediction.scorers.slice(0, 3)) {
      const matchedRealScorer = realScorersList.find((rs) =>
        arePlayersMatching(predScorer.player_name, rs.player_name)
      );

      if (matchedRealScorer && (matchedRealScorer.goals || 1) > 0) {
        const actualGoals = matchedRealScorer.goals || 1;
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

    const fs = require("fs");
    const path = require("path");
    const evalMatchesPath = path.join(__dirname, "../src/data/officialEvaluatedMatches.json");
    const evalPredsPath = path.join(__dirname, "../src/data/officialEvaluatedPredictions.json");

    let officialMatches = [];
    try {
      if (fs.existsSync(evalMatchesPath)) {
        officialMatches = JSON.parse(fs.readFileSync(evalMatchesPath, "utf8"));
      }
    } catch (e) {
      console.warn("Could not read officialEvaluatedMatches.json:", e);
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

    const matchId = targetMatch ? targetMatch.id : "00000000-0000-4000-8000-00006399b6d3";

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
