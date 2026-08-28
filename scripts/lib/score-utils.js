const fs = require("fs");
const path = require("path");

const teamData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../src/data/teamAliases.json"), "utf8")
);

function cleanTeamName(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b|\bcf\b|\bafc\b|\bssc\b|\bas\b|\bacf\b|\bss\b|\bus\b|\brc\b|\bcd\b|\bud\b|\brcd\b|\bca\b|\b1\.\b|\bvfb\b|\bvfl\b|\btsg\b|\bfsv\b|\bsv\b|\brb\b|\bbvb\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeTeamName(name) {
  if (!name) return "";
  const cleaned = cleanTeamName(name);
  if (teamData.aliasMap[cleaned]) return teamData.aliasMap[cleaned];

  for (const dbName of teamData.canonicalDbTeams) {
    if (cleanTeamName(dbName) === cleaned) return dbName;
  }
  for (const dbName of teamData.canonicalDbTeams) {
    const cDb = cleanTeamName(dbName);
    if (cleaned.includes(cDb) || cDb.includes(cleaned)) return dbName;
  }
  return name;
}

function normalizePlayerName(name) {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const knockoutPairs = {
  conference: new Set(teamData.knockoutPairs?.conference || []),
  europa: new Set(teamData.knockoutPairs?.europa || []),
  champions: new Set(teamData.knockoutPairs?.champions || []),
};

function isKnockoutMatch(homeTeam, awayTeam, league) {
  const cHome = cleanTeamName(homeTeam);
  const cAway = cleanTeamName(awayTeam);
  const pairKey = `${cHome}-${cAway}`;
  if (knockoutPairs.conference.has(pairKey)) return true;
  if (knockoutPairs.europa.has(pairKey)) return true;
  if (knockoutPairs.champions.has(pairKey)) return true;
  if (league && String(league).toLowerCase().includes("copa italia")) return true;
  return false;
}

function evaluateSurvivorProgression(params) {
  const activeNorm = normalizeTeamName(params.activeTeamName);
  const predNorm = normalizeTeamName(params.predictedWinner);
  const actualNorm = normalizeTeamName(params.actualWinner);

  if (predNorm === actualNorm) {
    if (predNorm !== activeNorm) {
      const transferRecord = {
        from_team: activeNorm,
        to_team: predNorm,
        match_id: params.matchId,
        round: params.roundName,
        date: params.matchDate,
      };
      return {
        newStatus: 'ALIVE',
        newTeamName: predNorm,
        updatedHistory: [...params.currentHistory, transferRecord],
        transferred: true,
      };
    }
    return {
      newStatus: 'ALIVE',
      newTeamName: activeNorm,
      updatedHistory: params.currentHistory,
      transferred: false,
    };
  }

  return {
    newStatus: 'ELIMINATED',
    newTeamName: activeNorm,
    updatedHistory: params.currentHistory,
    transferred: false,
  };
}

function matchIdToUuid(id) {
  const str = String(id).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const num = parseInt(str.replace(/\D/g, ""), 10);
  if (!isNaN(num) && num > 0) {
    const hex = num.toString(16).padStart(12, "0").slice(-12);
    return `00000000-0000-4000-8000-${hex}`;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
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

      if (matchedRealScorer && (matchedRealScorer.goals ?? 0) > 0) {
        const actualGoals = matchedRealScorer.goals ?? 0;
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

module.exports = {
  cleanTeamName,
  normalizeTeamName,
  normalizePlayerName,
  matchIdToUuid,
  cleanPhonetic,
  arePlayersMatching,
  calculateScore,
  isKnockoutMatch,
  evaluateSurvivorProgression,
};
