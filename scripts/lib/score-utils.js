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

function isKnockoutCup(leagueOrSlug) {
  const norm = String(leagueOrSlug || "").toLowerCase().trim();
  return (
    norm.includes("champions") ||
    norm.includes("europa") ||
    norm.includes("conference") ||
    norm.includes("copa italia") ||
    norm.includes("coppa") ||
    norm.includes("fa cup") ||
    norm.includes("copa del rey") ||
    norm.includes("dfb-pokal") ||
    norm.includes("dfb pokal") ||
    norm === "cl" ||
    norm === "el" ||
    norm === "ecl" ||
    norm === "ci" ||
    norm === "facup" ||
    norm === "copadelrey" ||
    norm === "dfbpokal"
  );
}

function getKnockoutCupSlug(league) {
  if (!league) return null;
  const lower = String(league).toLowerCase();
  if (lower.includes("champions")) return "champions";
  if (lower.includes("europa") && !lower.includes("conference")) return "europa";
  if (lower.includes("conference")) return "conference";
  if (lower.includes("copa italia") || lower.includes("coppa")) return "coppaitalia";
  if (lower.includes("fa cup")) return "facup";
  if (lower.includes("copa del rey")) return "copadelrey";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "dfbpokal";
  return null;
}

function getEspnSlug(league) {
  if (!league) return null;
  const lower = String(league).toLowerCase();
  if (lower.includes("fa cup")) return "eng.fa";
  if (lower.includes("copa del rey")) return "esp.copa_del_rey";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "ger.dfb_pokal";
  if (lower.includes("copa italia") || lower.includes("coppa")) return "ita.coppa_italia";
  if (lower.includes("champions")) return "uefa.champions";
  if (lower.includes("europa") && !lower.includes("conference")) return "uefa.europa";
  if (lower.includes("conference")) return "uefa.europa.conf";
  return null;
}

function getKnockoutRound(matchDate, tournamentSlug) {
  if (!matchDate) return "Ronda KO";
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) return "Ronda KO";

  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  if (tournamentSlug === "champions" || tournamentSlug === "europa" || tournamentSlug === "conference") {
    // Formato 2026/27 (36 equipos): feb = playoff R32, mar = R16, abr = QF, abr-may = SF, may = F
    if (month === 2) return "Dieciseisavos de Final";
    if (month === 3) return "Octavos de Final";
    if (month === 4 && day <= 20) return "Cuartos de Final";
    if ((month === 4 && day > 20) || (month === 5 && day <= 15)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "coppaitalia") {
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "facup") {
    if (month === 1) return "Tercera Ronda";
    if (month === 2 && day <= 15) return "Cuarta Ronda";
    if ((month === 2 && day > 15) || (month === 3 && day <= 10)) return "Quinta Ronda";
    if ((month === 3 && day > 10) || (month === 4 && day <= 15)) return "Cuartos de Final";
    if ((month === 4 && day > 15) || (month === 5 && day <= 10)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "copadelrey") {
    if (month === 12) return "Dieciseisavos";
    if (month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || (month === 4 && day <= 15)) return "Semifinal";
    if (month >= 4) return "Final";
  }
  if (tournamentSlug === "dfbpokal") {
    if (month <= 8) return "Primera Ronda";
    if (month === 9 || month === 10 || month === 11) return "Segunda Ronda";
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4 || (month === 5 && day <= 15)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  return "Ronda KO";
}

function getTeamCups(teamName) {
  const cups = teamData.teamCups?.[teamName];
  return Array.isArray(cups) ? cups : [];
}

function isKnockoutMatch(homeTeam, awayTeam, league, matchDate) {
  const cHome = cleanTeamName(homeTeam);
  const cAway = cleanTeamName(awayTeam);
  const pairKey = `${cHome}-${cAway}`;
  if (knockoutPairs.conference.has(pairKey)) return true;
  if (knockoutPairs.europa.has(pairKey)) return true;
  if (knockoutPairs.champions.has(pairKey)) return true;
  if (league) {
    const lower = String(league).toLowerCase();
    if (lower.includes("copa italia") || lower.includes("coppa")) return true;
    if (lower.includes("fa cup")) return true;
    if (lower.includes("copa del rey")) return true;
    if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return true;
    // Competiciones europeas: fase liga termina en enero; desde febrero hasta agosto son rondas KO
    if (
      (lower.includes("champions") ||
        (lower.includes("europa") && !lower.includes("conference")) ||
        lower.includes("conference")) &&
      matchDate
    ) {
      const d = new Date(matchDate);
      const m = d.getUTCMonth();
      if (!isNaN(d.getTime()) && m >= 1 && m <= 7) return true;
    }
  }
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
  const h1 = Math.abs(hash).toString(16).padStart(8, "0").slice(-8);
  const h2 = Math.abs(hash * 0x45d9f3b + str.length).toString(16).padStart(4, "0").slice(-4);
  return `00000000-0000-4000-8000-${h1}${h2}`;
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
  isKnockoutCup,
  getKnockoutCupSlug,
  getEspnSlug,
  getKnockoutRound,
  getTeamCups,
  evaluateSurvivorProgression,
};
