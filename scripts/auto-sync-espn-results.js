const fs = require("fs");
const path = require("path");

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
    bayernmunchen: "Bayern Munich",
    bayern: "Bayern Munich",
    stuttgart: "Stuttgart",
    mancity: "Manchester City",
    manchestercity: "Manchester City",
    crystalpalace: "Crystal Palace",
    acmilan: "AC Milan",
    milan: "AC Milan",
    venezia: "Venezia",
    realbetis: "Real Betis",
    betis: "Real Betis",
    alaves: "Alavés",
    deportivoalaves: "Alavés",
    realmadrid: "Real Madrid",
    barcelona: "Barcelona",
    arsenal: "Arsenal",
    liverpool: "Liverpool",
    chelsea: "Chelsea",
    juventus: "Juventus",
    intermilan: "Inter Milan",
    inter: "Inter Milan",
  };

  return aliasMap[cleaned] || name;
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
  const normA = (nameA || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const normB = (nameB || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
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

function calculateScore(prediction, real) {
  let pointsSign = 0;
  let pointsExactScore = 0;
  let pointsGoalDiff = 0;
  let pointsScorersName = 0;
  let pointsScorersQuantity = 0;
  const details = [];

  const predSign = Math.sign(prediction.home_score - prediction.away_score);
  const realSign = Math.sign(real.result_home - real.result_away);

  const correctSign = predSign === realSign;
  if (correctSign) {
    pointsSign = 3;
    details.push("Resultado correcto (+3 pts)");
  }

  const exactScore =
    prediction.home_score === real.result_home &&
    prediction.away_score === real.result_away;

  if (exactScore) {
    pointsExactScore = 2;
    details.push("Marcador exacto (+2 pts)");
  } else {
    const diffHome = Math.abs(prediction.home_score - real.result_home);
    const diffAway = Math.abs(prediction.away_score - real.result_away);
    const totalDiff = diffHome + diffAway;

    if (totalDiff === 1) {
      pointsGoalDiff = 1;
      details.push("Diferencia de 1 gol (+1 pt)");
    }
  }

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

  return { totalPoints, details, exactScore, correctSign, scorersNameHits };
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

  let newResultsCount = 0;

  for (const slug of LEAGUE_SLUGS) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`;
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
        const fixture = officialFixtures.find((f) => {
          const hF = normalizeTeamName(f.home_team).toLowerCase();
          const aF = normalizeTeamName(f.away_team).toLowerCase();
          return (hF.includes(homeName.toLowerCase()) || homeName.toLowerCase().includes(hF)) &&
                 (aF.includes(awayName.toLowerCase()) || awayName.toLowerCase().includes(aF));
        });

        const matchId = fixture ? fixture.id : `espn-${ev.id || `${homeName}-${awayName}`}`;

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
    const match = officialMatches.find((m) => m.id === pred.match_id || 
      (normalizeTeamName(m.home_team).toLowerCase().includes(pred.match_id.toLowerCase()))
    );

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
}

autoSync();
