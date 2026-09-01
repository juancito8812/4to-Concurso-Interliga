#!/usr/bin/env node
// verify-logic.js — Verificación integral de la lógica de negocio del concurso
const assert = require("assert");
const { normalizeTeamName, matchIdToUuid, calculateScore, isKnockoutMatch, isKnockoutCup, getKnockoutCupSlug, getKnockoutRound, getTeamCups, evaluateSurvivorProgression, arePlayersMatching } = require("./lib/score-utils.js");

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log("✅", name); }
  catch (e) { failed++; console.log("❌", name, "-", e.message); }
};

// ============ 1. SCORING: todas las reglas ============
console.log("\n=== 1. Motor de scoring ===");
test("Resultado correcto +3 (sin marcador exacto ni diferencia)", () => {
  const r = calculateScore({ home_score: 2, away_score: 0, scorers: [] }, { result_home: 3, result_away: 1, scorers: [] });
  assert.equal(r.totalPoints, 3);
});
test("Marcador exacto +3+2=5", () => {
  const r = calculateScore({ home_score: 2, away_score: 0, scorers: [] }, { result_home: 2, result_away: 0, scorers: [] });
  // exactScore debe dar +2 adicional
  assert.equal(r.pointsExactScore, 2);
  assert.equal(r.totalPoints, 5);
});
test("Diferencia de 1 gol +1", () => {
  const r = calculateScore({ home_score: 2, away_score: 0, scorers: [] }, { result_home: 2, result_away: 1, scorers: [] });
  assert.equal(r.goalDiffClose, true);
  assert.equal(r.pointsGoalDiff, 1);
});
test("Goleador por nombre +1 (fonético)", () => {
  const r = calculateScore(
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Lionel Messi", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Lionel Messi", team: "home", goals: 1 }] }
  );
  assert.equal(r.pointsScorersName, 1);
});
test("Goleador con acentos/tildes (Messi vs Mésí)", () => {
  const r = calculateScore(
    { home_score: 1, away_score: 0, scorers: [{ player_name: "José Giménez", team: "home", goals: 1 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Jose Gimenez", team: "home", goals: 1 }] }
  );
  assert.equal(r.pointsScorersName, 1);
});
test("Cantidad exacta de goleadores: 1 predicho = 1 real -> +2", () => {
  const r = calculateScore(
    { home_score: 1, away_score: 0, scorers: [{ player_name: "Erling Haaland", team: "home", goals: 3 }] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Erling Haaland", team: "home", goals: 3 }] }
  );
  assert.equal(r.pointsScorersQuantity, 2);
});
test("Cantidad exacta de goleadores: 2 predichos = 2 reales -> +2", () => {
  const r = calculateScore(
    { home_score: 3, away_score: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 2 },
      { player_name: "Bellingham", team: "home", goals: 1 }
    ] },
    { result_home: 3, result_away: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 1 },
      { player_name: "Bellingham", team: "home", goals: 1 }
    ] }
  );
  assert.equal(r.pointsScorersQuantity, 2);
});
test("Cantidad NO exacta: 2 predichos vs 1 real -> 0", () => {
  const r = calculateScore(
    { home_score: 3, away_score: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 2 },
      { player_name: "Martinelli", team: "home", goals: 1 }
    ] },
    { result_home: 3, result_away: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 1 }
    ] }
  );
  assert.equal(r.pointsScorersQuantity, 0);
});
test("Cantidad NO exacta: 1 predicho vs 3 reales -> 0", () => {
  const r = calculateScore(
    { home_score: 5, away_score: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 5 }
    ] },
    { result_home: 5, result_away: 0, scorers: [
      { player_name: "Mbappé", team: "home", goals: 2 },
      { player_name: "Vinicius", team: "home", goals: 2 },
      { player_name: "Bellingham", team: "home", goals: 1 }
    ] }
  );
  assert.equal(r.pointsScorersQuantity, 0);
});
test("Sin goleadores predichos -> 0 (no aplica regla #5)", () => {
  const r = calculateScore(
    { home_score: 1, away_score: 0, scorers: [] },
    { result_home: 1, result_away: 0, scorers: [{ player_name: "Mbappé", team: "home", goals: 1 }] }
  );
  assert.equal(r.pointsScorersQuantity, 0);
});
test("Sin goleadores reales -> 0 (no aplica regla #5)", () => {
  const r = calculateScore(
    { home_score: 0, away_score: 0, scorers: [{ player_name: "Mbappé", team: "home", goals: 0 }] },
    { result_home: 0, result_away: 0, scorers: [] }
  );
  assert.equal(r.pointsScorersQuantity, 0);
});
test("Caso real Milanarg: predijo 2 goleadores, real 1 -> 5 pts (sin regla #5)", () => {
  const r = calculateScore(
    { home_score: 3, away_score: 0, scorers: [{ player_name: "Gonçalo Ramos", team: "home", goals: 2 }, { player_name: "Adrien Rabiot", team: "home", goals: 1 }] },
    { result_home: 2, result_away: 0, scorers: [{ player_name: "Gonçalo Ramos", team: "home", goals: 1 }] }
  );
  // Resultado correcto +3, diff 1 gol +1, goleador Ramos +1 = 5
  // Regla #5 NO aplica (2 predichos ≠ 1 real)
  assert.equal(r.totalPoints, 5);
});
test("Fallo total = 0 pts", () => {
  const r = calculateScore({ home_score: 0, away_score: 3, scorers: [] }, { result_home: 2, result_away: 0, scorers: [] });
  assert.equal(r.totalPoints, 0);
});

// ============ 2. NORMALIZACIÓN ============
console.log("\n=== 2. Normalización de equipos ===");
const normTests = [
  ["FC Bayern München", "Bayern Munich"],
  ["1. FC Köln", "Köln"],
  ["Bodo/Glimt", "FK Bodø/Glimt"],
  ["Slavia Prague", "SK Slavia Praha"],
  ["Fenerbahce", "Fenerbahçe"],
  ["Feyenoord Rotterdam", "Feyenoord"],
  ["Real Racing Club de Santander", "Racing Santander"],
  ["Coventry City FC", "Coventry City"],
  ["Sunderland AFC", "Sunderland"],
  ["FC Internazionale Milano", "Inter Milan"],
  ["Internazionale", "Inter Milan"],
  ["Club Brugge", "Club Brujas"],
  ["PSV Eindhoven", "PSV"],
  ["Sporting CP", "Sporting Clube de Portugal"],
  ["Paphos", "Pafos FC"],
  ["Olympiacos", "PAE Olympiakos SFP"],
  ["US Sassuolo Calcio", "Sassuolo"],
  ["TSG 1899 Hoffenheim", "Hoffenheim"],
  ["RSC Anderlecht", "Anderlecht"],
  ["Hapoel Be'er Sheva", "Hapoel Be'er Sheva"],
];
normTests.forEach(([input, expected]) => {
  test(`normalizeTeamName("${input}") → ${expected}`, () => {
    assert.equal(normalizeTeamName(input), expected);
  });
});

// ============ 3. KO / SURVIVOR ============
console.log("\n=== 3. Lógica KO y survivor ===");
test("Fase liga UCL (sep-ene) NO es KO", () => {
  assert.equal(isKnockoutMatch("Real Madrid", "Barcelona", "Champions League", "2026-11-03"), false);
  assert.equal(isKnockoutMatch("Arsenal", "Chelsea", "Europa League", "2026-10-01"), false);
  assert.equal(isKnockoutMatch("Como", "Napoli", "Conference League", "2026-12-10"), false);
});
test("Rondas KO europeas (feb+) SÍ son KO", () => {
  assert.equal(isKnockoutMatch("TBD Home", "TBD Away", "Champions League", "2027-02-17"), true);
  assert.equal(isKnockoutMatch("TBD Home", "TBD Away", "Europa League", "2027-03-11"), true);
  assert.equal(isKnockoutMatch("TBD Home", "TBD Away", "Conference League", "2027-04-08"), true);
});
test("Copas domésticas siempre KO", () => {
  assert.equal(isKnockoutMatch("Inter Milan", "Juventus", "Copa Italia"), true);
  assert.equal(isKnockoutMatch("Arsenal", "Chelsea", "FA Cup"), true);
  assert.equal(isKnockoutMatch("Real Madrid", "Barcelona", "Copa del Rey"), true);
  assert.equal(isKnockoutMatch("Bayern Munich", "Dortmund", "DFB-Pokal"), true);
});
test("Ligas domésticas nunca KO", () => {
  assert.equal(isKnockoutMatch("Arsenal", "Chelsea", "Premier League", "2026-09-01"), false);
  assert.equal(isKnockoutMatch("Real Madrid", "Barcelona", "LaLiga", "2026-09-01"), false);
});
test("getKnockoutRound formato 2026/27", () => {
  assert.equal(getKnockoutRound("2027-02-18", "champions"), "Dieciseisavos de Final");
  assert.equal(getKnockoutRound("2027-03-11", "champions"), "Octavos de Final");
  assert.equal(getKnockoutRound("2027-04-08", "champions"), "Cuartos de Final");
  assert.equal(getKnockoutRound("2027-05-01", "champions"), "Semifinal");
  assert.equal(getKnockoutRound("2027-05-31", "champions"), "Final");
});
test("evaluateSurvivorProgression: transferencia de camiseta", () => {
  const r = evaluateSurvivorProgression({
    activeTeamName: "Real Madrid", predictedWinner: "Manchester City", actualWinner: "Manchester City",
    matchId: "m1", roundName: "Dieciseisavos de Final", matchDate: "2027-02-18", currentHistory: [],
  });
  assert.equal(r.newStatus, "ALIVE");
  assert.equal(r.newTeamName, "Manchester City");
  assert.equal(r.transferred, true);
});
test("evaluateSurvivorProgression: eliminación", () => {
  const r = evaluateSurvivorProgression({
    activeTeamName: "Real Madrid", predictedWinner: "Real Madrid", actualWinner: "Manchester City",
    matchId: "m2", roundName: "Dieciseisavos de Final", matchDate: "2027-02-18", currentHistory: [],
  });
  assert.equal(r.newStatus, "ELIMINATED");
  assert.equal(r.transferred, false);
});
test("getTeamCups: Real Madrid → copadelrey+champions", () => {
  const cups = getTeamCups("Real Madrid").sort();
  assert.deepEqual(cups, ["champions", "copadelrey"]);
});
test("getTeamCups: AEK Athens → champions", () => {
  assert.deepEqual(getTeamCups("AEK Athens"), ["champions"]);
});
test("getTeamCups: Sunderland → europa+facup", () => {
  assert.deepEqual(getTeamCups("Sunderland").sort(), ["europa", "facup"]);
});

// ============ 4. IDS ============
console.log("\n=== 4. IDs deterministas ===");
test("matchIdToUuid determinista", () => {
  const a = matchIdToUuid("123456789");
  const b = matchIdToUuid("123456789");
  assert.equal(a, b);
  assert.equal(a, "00000000-0000-4000-8000-0000075bcd15");
});
test("matchIdToUuid formato UUID válido", () => {
  const u = matchIdToUuid("EL-2027-LP-MD1-1");
  assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

// ============ 5. MATCHING FONÉTICO ============
console.log("\n=== 5. Matching fonético de jugadores ===");
test("arePlayersMatching: iguales", () => {
  assert.equal(arePlayersMatching("Erling Haaland", "Erling Haaland"), true);
});
test("arePlayersMatching: acentos", () => {
  assert.equal(arePlayersMatching("Gonçalo Ramos", "Goncalo Ramos"), true);
});
test("arePlayersMatching: distintos", () => {
  assert.equal(arePlayersMatching("Erling Haaland", "Lionel Messi"), false);
});

console.log(`\n${failed === 0 ? "🎉 TODA LA LÓGICA VERIFICADA" : `🔴 ${failed} fallos`} (${passed} checks)`);
process.exit(failed === 0 ? 0 : 1);
