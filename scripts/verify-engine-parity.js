#!/usr/bin/env node
/**
 * verify-engine-parity.js — PRUEBA DE PARIDAD ENTRE LOS DOS MOTORES DE PUNTUACIÓN
 *
 * Motivo: el concurso tiene DOS implementaciones de la misma regla:
 *   1. `scripts/lib/score-utils.js`  → motor JS (lo usa el cron / backend).
 *   2. `src/lib/scoring.ts`          → motor TS (lo usa el frontend para el recálculo).
 *
 * `verify-logic.js` sólo prueba el motor JS. Si los dos motores divergen, el
 * ranking muestra puntos distintos a los guardados en la base de datos — el
 * síntoma "cambiaron los puntos". Este script compara ambos motores, campo por
 * campo, sobre los datos reales + casos límite, y falla (exit 1) ante cualquier
 * diferencia.
 *
 * Uso:  node scripts/verify-engine-parity.js   (o  npm run verify:parity)
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
const jsEngine = require(path.join(ROOT, "scripts/lib/score-utils.js"));

// --- Carga del motor TypeScript compilándolo en memoria (sin ensuciar el repo) ---
function loadTsEngine() {
  const file = path.join(ROOT, "src/lib/scoring.ts");
  const source = fs.readFileSync(file, "utf8");
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  // `out` es el resultado de compilar `src/lib/scoring.ts` del propio repo (código
  // local y confiable, no entrada de usuario) — igual que hace `tsc` al construir.
  // No se interpola ninguna variable externa en el cuerpo de la función.
  new Function("exports", "require", "module", "__filename", "__dirname", out)(
    mod.exports,
    require,
    mod,
    file,
    path.dirname(file)
  );
  return mod.exports;
}
const tsEngine = loadTsEngine();

// Campos del desglose que DEBEN coincidir exactamente entre los dos motores.
const FIELDS = [
  "totalPoints",
  "correctSign",
  "pointsSign",
  "exactScore",
  "pointsExactScore",
  "goalDiffClose",
  "pointsGoalDiff",
  "scorersNameHits",
  "pointsScorersName",
  "pointsScorersQuantity",
];

function compare(label, prediction, real) {
  const a = jsEngine.calculateScore(prediction, real);
  const b = tsEngine.calculateScore(prediction, real);
  const diffs = FIELDS.filter((f) => a[f] !== b[f]);
  if (diffs.length) {
    throw new Error(
      `${label}\n     JS : ${JSON.stringify(pick(a))}\n     TS : ${JSON.stringify(pick(b))}\n     difieren: ${diffs.join(", ")}`
    );
  }
  // Los detalles textuales también deben coincidir (es lo que ve el usuario).
  assert.deepStrictEqual(a.details, b.details, `${label} — details difieren: ${JSON.stringify(a.details)} vs ${JSON.stringify(b.details)}`);
  return a.totalPoints;
}
const pick = (o) => Object.fromEntries(FIELDS.map((f) => [f, o[f]]));

let passed = 0,
  failed = 0,
  cases = 0,
  puntosReales = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.log("❌", name, "\n    ", e.message);
  }
};

console.log("\n=== 1. Paridad sobre los DATOS REALES del concurso ===");
try {
  const preds = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/officialEvaluatedPredictions.json"), "utf8"));
  const matches = Object.fromEntries(
    JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/officialEvaluatedMatches.json"), "utf8")).map((m) => [m.id, m])
  );
  const evaluated = preds.filter((p) => matches[p.match_id]);
  test(`${evaluated.length} pronósticos evaluados: JS === TS`, () => {
    for (const p of evaluated) {
      const m = matches[p.match_id];
      const pts = compare(
        `${p.display_name || p.user_id} | ${m.home_team} vs ${m.away_team}`,
        { home_score: p.home_score, away_score: p.away_score, scorers: p.scorers || [] },
        { result_home: m.result_home, result_away: m.result_away, scorers: m.scorers || [] }
      );
      // Y además: el motor debe reproducir los puntos ya guardados (fuente de verdad).
      assert.strictEqual(
        pts,
        p.points,
        `${p.display_name || p.user_id} en ${m.home_team} vs ${m.away_team}: guardado ${p.points} ≠ motor ${pts}`
      );
      puntosReales += pts;
      cases++;
    }
  });
  console.log(`   ✅ ${evaluated.length} pronósticos: ambos motores coinciden y reproducen los puntos guardados (${puntosReales} pts)`);
} catch (e) {
  failed++;
  console.log("❌ Datos reales:", e.message);
}

console.log("\n=== 2. Paridad en CASOS LÍMITE (mismos casos que verify-logic.js) ===");
const CASES = [
  ["Signo sin exacto", { home_score: 2, away_score: 0, scorers: [] }, { result_home: 3, result_away: 1, scorers: [] }],
  ["Marcador exacto", { home_score: 2, away_score: 0, scorers: [] }, { result_home: 2, result_away: 0, scorers: [] }],
  ["Empate exacto", { home_score: 1, away_score: 1, scorers: [] }, { result_home: 1, result_away: 1, scorers: [] }],
  ["Diferencia de 1 gol", { home_score: 2, away_score: 0, scorers: [] }, { result_home: 2, result_away: 1, scorers: [] }],
  ["Diferencia de 2 goles (sin bonus)", { home_score: 2, away_score: 0, scorers: [] }, { result_home: 3, result_away: 0, scorers: [] }],
  ["Signo erróneo", { home_score: 1, away_score: 2, scorers: [] }, { result_home: 3, result_away: 1, scorers: [] }],
  ["Sin puntos", { home_score: 0, away_score: 1, scorers: [] }, { result_home: 4, result_away: 0, scorers: [] }],
  ["Empate real vs victoria local", { home_score: 2, away_score: 1, scorers: [] }, { result_home: 1, result_away: 1, scorers: [] }],
  [
    "Goleador exacto",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Lionel Messi", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Lionel Messi", team: "home", goals: 1 }] },
  ],
  [
    "Goleador con acentos (Jose Gimenez = José Giménez)",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "José Giménez", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Jose Gimenez", team: "home", goals: 1 }] },
  ],
  [
    "Goleador sólo apellido (Kane = Harry Kane)",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Kane", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Harry Kane", team: "home", goals: 1 }] },
  ],
  [
    "Goleador no acertado",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Mbappé", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Harry Kane", team: "home", goals: 1 }] },
  ],
  [
    "Anti-inflación: mismo nombre 4 veces = 1 pt",
    {
      home_score: 2,
      away_score: 0,
      scorers: [
        { player_name: "Lionel Messi", team: "home", goals: 3 },
        { player_name: "Lionel Messi", team: "home", goals: 3 },
        { player_name: "Lionel Messi", team: "home", goals: 3 },
        { player_name: "Lionel Messi", team: "home", goals: 3 },
      ],
    },
    { result_home: 2, result_away: 0, scorers: [{ player_name: "Lionel Messi", team: "home", goals: 3 }] },
  ],
  [
    "Cap por equipo: 6 en local acredita 5",
    {
      home_score: 6,
      away_score: 0,
      scorers: ["A", "B", "C", "D", "E", "F"].map((n) => ({ player_name: `Jugador ${n}`, team: "home", goals: 1 })),
    },
    {
      result_home: 6,
      result_away: 0,
      scorers: ["A", "B", "C", "D", "E", "F"].map((n) => ({ player_name: `Jugador ${n}`, team: "home", goals: 1 })),
    },
  ],
  [
    "Cap 5+5 (10 goleadores acreditados)",
    {
      home_score: 5,
      away_score: 5,
      scorers: [
        ...["A", "B", "C", "D", "E"].map((n) => ({ player_name: `Local ${n}`, team: "home", goals: 1 })),
        ...["A", "B", "C", "D", "E"].map((n) => ({ player_name: `Visita ${n}`, team: "away", goals: 1 })),
      ],
    },
    {
      result_home: 5,
      result_away: 5,
      scorers: [
        ...["A", "B", "C", "D", "E"].map((n) => ({ player_name: `Local ${n}`, team: "home", goals: 1 })),
        ...["A", "B", "C", "D", "E"].map((n) => ({ player_name: `Visita ${n}`, team: "away", goals: 1 })),
      ],
    },
  ],
  [
    "Regla #5 eliminada: máx goles predicho == real",
    { home_score: 3, away_score: 0, scorers: [{ player_name: "X", team: "home", goals: 3 }] },
    { result_home: 3, result_away: 0, scorers: [{ player_name: "X", team: "home", goals: 3 }] },
  ],
  [
    "Goleador sin team definido (default home)",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Kane", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Kane", goals: 1 }] },
  ],
  [
    "Goleador real con 0 goles no acredita",
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Kane", team: "home", goals: 0 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Kane", team: "home", goals: 0 }] },
  ],
  ["Sin goleadores", { home_score: 2, away_score: 1, scorers: [] }, { result_home: 2, result_away: 1, scorers: [] }],
];
for (const [name, pred, real] of CASES) {
  test(name, () => {
    compare(name, pred, real);
    cases++;
  });
}

console.log(`\n${failed === 0 ? "🎉 PARIDAD VERIFICADA" : `🔴 ${failed} FALLOS`} — ${passed} checks, ${cases} casos comparados (JS vs TS)`);
process.exit(failed === 0 ? 0 : 1);
