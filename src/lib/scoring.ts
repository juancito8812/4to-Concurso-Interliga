/**
 * Interliga Football Prediction Contest Scoring System
 *
 * Scoring Rules:
 * 1. Resultado correcto (Signo 1X2): 3 puntos
 * 2. Marcador exacto: 2 puntos
 * 3. Diferencia de 1 gol en el marcador: 1 punto (cuando no es exacto)
 * 4. Goleador acertado (nombre): 1 punto por cada goleador que anote
 * 5. Cantidad exacta de goles del goleador: 2 puntos por goleador acertado en cantidad
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

  // 4 & 5. Scorers (Goleadores acertados y cantidad de goles)
  let scorersNameHits = 0;
  let scorersQuantityHits = 0;

  const realScorersMap = new Map<string, number>();
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
        // Goleador acertado (nombre) -> 1 pt
        scorersNameHits += 1;
        pointsScorersName += 1;
        details.push(`Goleador acertado: ${predScorer.player_name} (+1 pt)`);

        // Cantidad exacta de goles del goleador -> 2 pts
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
