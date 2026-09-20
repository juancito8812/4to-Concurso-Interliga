#!/usr/bin/env node
/**
 * recalcular-puntos.js — Elimina los puntos acuotados por la Regla #5
 * (cantidad exacta de goles del líder goleador) de oficialEvaluatedPredictions.json.
 * Recalcula los puntos de cada pronóstico bajo el motor corregido (4 reglas) y
 * actualiza los JSON de datos (src/data y public/data).
 */
const fs = require("fs");
const path = require("path");
const { calculateScore } = require("./lib/score-utils.js");

const ROOT = path.resolve(__dirname, "..");
const PRED_FILE = path.join(ROOT, "src/data/officialEvaluatedPredictions.json");
const MATCH_FILE = path.join(ROOT, "src/data/officialEvaluatedMatches.json");
const PUB_PRED = path.join(ROOT, "public/data/officialEvaluatedPredictions.json");
const PUB_MATCH = path.join(ROOT, "public/data/officialEvaluatedMatches.json");

const predictions = JSON.parse(fs.readFileSync(PRED_FILE, "utf8"));
const matches = JSON.parse(fs.readFileSync(MATCH_FILE, "utf8"));

// Build match lookup
const matchMap = new Map();
for (const m of matches) {
  matchMap.set(m.id || m.match_id, m);
}

let affected = 0;
let pointsSubtracted = 0;
let detailFixed = 0;

for (const p of predictions) {
  const match = matchMap.get(p.match_id || p.id) || matchMap.get(p.match_id);
  if (!match) continue;

  const real = {
    result_home: match.result_home,
    result_away: match.result_away,
    scorers: match.scorers || [],
  };

  const result = calculateScore(
    {
      home_score: p.prediction_home_score || p.home_score,
      away_score: p.prediction_away_score || p.away_score,
      scorers: p.prediction_scorers || p.scorers || [],
    },
    real
  );

  const oldPoints = p.total_points || p.points || 0;
  const newPoints = result.totalPoints;

  if (oldPoints !== newPoints) {
    const diff = oldPoints - newPoints;
    pointsSubtracted += diff;
    affected++;
    p.total_points = newPoints;
    p.points = newPoints;
  }

  // Remove old "Goles del líder goleador" lines from details
  const oldDetails = p.details || [];
  const newDetails = oldDetails.filter(
    (d) => !d.includes("Goles del líder goleador")
  );
  if (newDetails.length !== oldDetails.length) {
    detailFixed++;
    p.details = newDetails;
  }
}

fs.writeFileSync(PRED_FILE, JSON.stringify(predictions, null, 2) + "\n");
fs.writeFileSync(PUB_PRED, JSON.stringify(predictions, null, 2) + "\n");

console.log(`Recalculo completado:`);
console.log(`  Pronosticoss afectados: ${affected}`);
console.log(`  Puntos restados (Regla #5): ${pointsSubtracted}`);
console.log(`  Lineas de detalle limpiadas: ${detailFixed}`);
