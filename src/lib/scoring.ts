/**
 * Interliga Football Prediction Contest Scoring System
 *
 * Scoring Rules:
 * 1. Resultado correcto (Signo 1X2): 3 puntos
 * 2. Marcador exacto: 2 puntos
 * 3. Diferencia de 1 gol en el marcador: 1 punto (cuando no es exacto)
 * 4. Goleador acertado (nombre): 1 punto por cada goleador que anote
 * 5. Cantidad exacta de goleadores del partido: 2 puntos si la cantidad de goleadores pronosticados coincide con los reales
 */

export interface PredictedScorer {
  player_name: string;
  goals: number;
  team?: string;
}

export interface RealScorer {
  player_name: string;
  goals: number;
  team?: string;
}

export interface PredictionScoreInput {
  home_score: number;
  away_score: number;
  scorers?: PredictedScorer[];
}

export interface MatchResultInput {
  result_home: number;
  result_away: number;
  scorers?: RealScorer[];
}

export interface ScoringBreakdown {
  totalPoints: number;
  correctSign: boolean;
  pointsSign: number;
  exactScore: boolean;
  pointsExactScore: number;
  goalDiffClose: boolean;
  pointsGoalDiff: number;
  scorersNameHits: number;
  pointsScorersName: number;
  scorersQuantityHits: number;
  pointsScorersQuantity: number;
  details: string[];
}

/**
 * Normalizes player name for reliable comparison (case-insensitive, trimmed, no accents)
 */
export function normalizePlayerName(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Phonetic/clean normalization to handle spelling variants (ç/z/s, y/i, b/v)
 */
export function cleanPhonetic(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[czs]/g, "s")
    .replace(/[yi]/g, "i")
    .replace(/[bv]/g, "b")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Intelligent player name matcher handling full names, single names, initials, and spelling variants.
 */
export function arePlayersMatching(nameA: string, nameB: string): boolean {
  const normA = normalizePlayerName(nameA);
  const normB = normalizePlayerName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const cleanA = cleanPhonetic(normA);
  const cleanB = cleanPhonetic(normB);
  if (cleanA === cleanB) return true;

  const wordsA = normA.split(/[\s.-]+/).filter((w) => w.length > 0);
  const wordsB = normB.split(/[\s.-]+/).filter((w) => w.length > 0);

  // If one is single name (e.g. "Kane", "Mbappe", "Vinicius", "Rodri")
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

  // Both are multi-word (e.g. "Nico Williams" vs "N. Williams", "Gonçalo Ramos" vs "Gonzalo Ramos")
  const lastA = cleanPhonetic(wordsA[wordsA.length - 1]);
  const lastB = cleanPhonetic(wordsB[wordsB.length - 1]);
  const firstA = cleanPhonetic(wordsA[0]);
  const firstB = cleanPhonetic(wordsB[0]);

  if (lastA === lastB) {
    // Check first name or initial
    if (firstA === firstB) return true;
    if (firstA[0] === firstB[0] && (firstA.length === 1 || firstB.length === 1)) return true;
    if (firstA.length >= 4 && firstB.length >= 4 && (firstA.includes(firstB) || firstB.includes(firstA))) return true;
    return false;
  }

  return false;
}

/**
 * Calculate total points and itemized breakdown for a prediction against the real match outcome.
 */
export function calculateScore(
  prediction: PredictionScoreInput,
  real: MatchResultInput
): ScoringBreakdown {
  let pointsSign = 0;
  let pointsExactScore = 0;
  let pointsGoalDiff = 0;
  let pointsScorersName = 0;
  let pointsScorersQuantity = 0;
  const details: string[] = [];

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
    // 3. Difference of 1 goal (Diferencia de 1 gol en el marcador) -> 1 pt
    // Defined as off by 1 goal total across the score (e.g. predicted 2-1, real 2-0 or 3-1)
    const diffHome = Math.abs(prediction.home_score - real.result_home);
    const diffAway = Math.abs(prediction.away_score - real.result_away);
    const totalDiff = diffHome + diffAway;

    if (totalDiff === 1) {
      pointsGoalDiff = 1;
      details.push("Diferencia de 1 gol (+1 pt)");
    }
  }

  // 4. Scorers (Goleadores acertados -> 1 pt c/u)
  let scorersNameHits = 0;

  const realScorersList: RealScorer[] = real.scorers || [];

  if (prediction.scorers && prediction.scorers.length > 0) {
    for (const predScorer of prediction.scorers.slice(0, 5)) {
      const matchedRealScorer = realScorersList.find((rs) =>
        arePlayersMatching(predScorer.player_name, rs.player_name)
      );

      if (matchedRealScorer && (matchedRealScorer.goals ?? 0) > 0) {
        scorersNameHits += 1;
        pointsScorersName += 1;
        details.push(`Goleador acertado: ${predScorer.player_name} (+1 pt)`);
      }
    }
  }

  // 5. Cantidad exacta de goleadores del partido -> 2 pts
  const predictedScorerCount = prediction.scorers?.filter(s => s.goals > 0).length ?? 0;
  const realScorerCount = realScorersList.filter(s => (s.goals ?? 0) > 0).length;
  const scorersQuantityHits = (predictedScorerCount > 0 && realScorerCount > 0 && predictedScorerCount === realScorerCount) ? 1 : 0;
  if (scorersQuantityHits) {
    pointsScorersQuantity = 2;
    details.push(`Cantidad exacta de goleadores: ${realScorerCount} (+2 pts)`);
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
