/**
 * Unit Testing of Survivor Evaluation Logic
 * Task 3 of Knockout Survivor Implementation Plan
 *
 * Usage: node scripts/test-survivor.js
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Set fallback env vars for Supabase client when running outside Next.js
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Register ESM loader hook to resolve TS modules and @/ path aliases in Node.js
const loaderHook = `
import { isBuiltin } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith('@/')) {
    spec = path.resolve(process.cwd(), 'src', spec.slice(2));
  }
  if (!isBuiltin(spec) && (spec.startsWith('.') || spec.startsWith('/'))) {
    const basePath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const baseDir = path.dirname(basePath);
    const resolvedPath = path.isAbsolute(spec) ? spec : path.resolve(baseDir, spec);
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']) {
      const candidate = resolvedPath + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(spec, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const source = fs.readFileSync(fileURLToPath(url), 'utf8');
    return { format: 'json', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`;

register('data:text/javascript;base64,' + Buffer.from(loaderHook).toString('base64'), pathToFileURL('./'));

// Import domain modules dynamically after hook registration
const { evaluateSurvivorProgression } = await import('../src/lib/survivor.ts');
const { normalizeTeamName, cleanTeamName, isKnockoutCup } = await import('../src/lib/leagueConfig.ts');

console.log('\n============================================================');
console.log(' 🏆 KNOCKOUT SURVIVOR (HERENCIA DE EQUIPO) UNIT TEST SUITE');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// Scenario 1 (Transfer): User with Real Madrid predicts Manchester City to win. Manchester City wins.
// -------------------------------------------------------------
runTest('Scenario 1: Transfer - Real Madrid user predicts Man City to win against Man City, Man City wins', () => {
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Real Madrid',
    predictedWinner: 'Manchester City',
    actualWinner: 'Manchester City',
    matchId: 'match-champions-qf-1',
    roundName: 'Cuartos - Ida',
    matchDate: '2026-04-08',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ALIVE', 'User should remain ALIVE');
  assert.equal(result.newTeamName, 'Manchester City', 'User should inherit Manchester City jersey');
  assert.equal(result.transferred, true, 'Transferred flag should be true');
  assert.equal(result.updatedHistory.length, 1, 'History should contain exactly 1 transfer');
  assert.deepEqual(result.updatedHistory[0], {
    from_team: 'Real Madrid',
    to_team: 'Manchester City',
    match_id: 'match-champions-qf-1',
    round: 'Cuartos - Ida',
    date: '2026-04-08',
  });
});

// -------------------------------------------------------------
// Scenario 2 (Stay Alive with Own Club): User with Real Madrid predicts Real Madrid to win. Real Madrid wins.
// -------------------------------------------------------------
runTest('Scenario 2: Stay Alive - Real Madrid user predicts Real Madrid to win, Real Madrid wins', () => {
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Real Madrid',
    predictedWinner: 'Real Madrid',
    actualWinner: 'Real Madrid',
    matchId: 'match-champions-semi-1',
    roundName: 'Semifinal - Ida',
    matchDate: '2026-04-29',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ALIVE', 'User should remain ALIVE');
  assert.equal(result.newTeamName, 'Real Madrid', 'User should keep Real Madrid');
  assert.equal(result.transferred, false, 'Transferred flag should be false');
  assert.equal(result.updatedHistory.length, 0, 'History should remain empty (no transfers)');
});

// -------------------------------------------------------------
// Scenario 3 (Eliminated picking own club): User with Real Madrid predicts Real Madrid to win. Manchester City wins.
// -------------------------------------------------------------
runTest('Scenario 3: Eliminated - Real Madrid user predicts Real Madrid to win, Manchester City wins', () => {
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Real Madrid',
    predictedWinner: 'Real Madrid',
    actualWinner: 'Manchester City',
    matchId: 'match-champions-qf-2',
    roundName: 'Cuartos - Vuelta',
    matchDate: '2026-04-16',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ELIMINATED', 'User should be ELIMINATED (KO)');
  assert.equal(result.transferred, false, 'Transferred flag should be false');
  assert.equal(result.updatedHistory.length, 0, 'History should not record transfers upon elimination');
});

// -------------------------------------------------------------
// Scenario 4 (Eliminated picking rival): User with Real Madrid predicts Manchester City to win. Real Madrid wins.
// -------------------------------------------------------------
runTest('Scenario 4: Eliminated - Real Madrid user predicts Manchester City to win, Real Madrid wins', () => {
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Real Madrid',
    predictedWinner: 'Manchester City',
    actualWinner: 'Real Madrid',
    matchId: 'match-champions-qf-2',
    roundName: 'Cuartos - Vuelta',
    matchDate: '2026-04-16',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ELIMINATED', 'User should be ELIMINATED (KO)');
  assert.equal(result.transferred, false, 'Transferred flag should be false');
  assert.equal(result.updatedHistory.length, 0, 'History should not record transfers upon elimination');
});

// -------------------------------------------------------------
// Scenario 5 (Multiple transfers): Real Madrid -> Man City -> Juventus.
// -------------------------------------------------------------
runTest('Scenario 5: Multiple Transfers - Real Madrid -> Manchester City -> Juventus progression chain', () => {
  // Step 1: Real Madrid user predicts Manchester City, Man City wins
  const step1 = evaluateSurvivorProgression({
    activeTeamName: 'Real Madrid',
    predictedWinner: 'Manchester City',
    actualWinner: 'Manchester City',
    matchId: 'match-champions-r16',
    roundName: 'Octavos - Vuelta',
    matchDate: '2026-03-18',
    currentHistory: [],
  });

  assert.equal(step1.newStatus, 'ALIVE');
  assert.equal(step1.newTeamName, 'Manchester City');
  assert.equal(step1.transferred, true);
  assert.equal(step1.updatedHistory.length, 1);

  // Step 2: Now holding Manchester City jersey, user predicts Juventus, Juventus wins
  const step2 = evaluateSurvivorProgression({
    activeTeamName: step1.newTeamName,
    predictedWinner: 'Juventus',
    actualWinner: 'Juventus',
    matchId: 'match-champions-qf',
    roundName: 'Cuartos - Vuelta',
    matchDate: '2026-04-15',
    currentHistory: step1.updatedHistory,
  });

  assert.equal(step2.newStatus, 'ALIVE', 'User should remain ALIVE after 2nd transfer');
  assert.equal(step2.newTeamName, 'Juventus', 'Active jersey should now be Juventus');
  assert.equal(step2.transferred, true, 'Second transfer occurred');
  assert.equal(step2.updatedHistory.length, 2, 'History length should be 2');

  assert.deepEqual(step2.updatedHistory, [
    {
      from_team: 'Real Madrid',
      to_team: 'Manchester City',
      match_id: 'match-champions-r16',
      round: 'Octavos - Vuelta',
      date: '2026-03-18',
    },
    {
      from_team: 'Manchester City',
      to_team: 'Juventus',
      match_id: 'match-champions-qf',
      round: 'Cuartos - Vuelta',
      date: '2026-04-15',
    },
  ]);
});

// -------------------------------------------------------------
// Scenario 6 (Team name normalization with accents and variations):
// "Atlético Madrid" vs "Atletico de Madrid", "FC Bayern München" vs "Bayern Munich"
// -------------------------------------------------------------
runTest('Scenario 6: Team Name Normalization with accents, prefixes and variations', () => {
  // Direct normalizer assertions
  assert.equal(normalizeTeamName('Atlético Madrid'), 'Atlético Madrid');
  assert.equal(normalizeTeamName('Atletico de Madrid'), 'Atlético Madrid');
  assert.equal(normalizeTeamName('atletico madrid'), 'Atlético Madrid');
  assert.equal(normalizeTeamName('Club Atlético de Madrid'), 'Atlético Madrid');

  assert.equal(normalizeTeamName('FC Bayern München'), 'Bayern Munich');
  assert.equal(normalizeTeamName('Bayern Munich'), 'Bayern Munich');
  assert.equal(normalizeTeamName('bayern munchen'), 'Bayern Munich');
  assert.equal(normalizeTeamName('Bayern'), 'Bayern Munich');

  assert.equal(normalizeTeamName('Man City'), 'Manchester City');
  assert.equal(normalizeTeamName('Manchester City FC'), 'Manchester City');
  assert.equal(normalizeTeamName('Inter'), 'Inter Milan');
  assert.equal(normalizeTeamName('Internazionale'), 'Inter Milan');
  assert.equal(normalizeTeamName('PSG'), 'Paris Saint-Germain');

  // Progression evaluation test with unnormalized variations
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Atletico de Madrid',     // Unaccented variant
    predictedWinner: 'FC Bayern München',    // German accented variant with FC prefix
    actualWinner: 'Bayern Munich',           // Canonical DB name
    matchId: 'match-champions-semi-2',
    roundName: 'Semifinal - Vuelta',
    matchDate: '2026-05-06',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ALIVE', 'Match prediction should match canonical Bayern Munich');
  assert.equal(result.newTeamName, 'Bayern Munich', 'New team should be canonical Bayern Munich');
  assert.equal(result.transferred, true, 'Should detect transfer across name variants');
  assert.equal(result.updatedHistory.length, 1);
  assert.equal(result.updatedHistory[0].from_team, 'Atlético Madrid', 'From team should be canonical Atlético Madrid');
  assert.equal(result.updatedHistory[0].to_team, 'Bayern Munich', 'To team should be canonical Bayern Munich');
});

// -------------------------------------------------------------
// Scenario 7: Knockout Cup detection helper verification
// -------------------------------------------------------------
runTest('Scenario 7: Knockout Cup Helper (isKnockoutCup)', () => {
  // Cups that feature Knockout Survivor mechanics
  assert.equal(isKnockoutCup('champions'), true);
  assert.equal(isKnockoutCup('Champions League'), true);
  assert.equal(isKnockoutCup('CL'), true);
  assert.equal(isKnockoutCup('europa'), true);
  assert.equal(isKnockoutCup('Europa League'), true);
  assert.equal(isKnockoutCup('EL'), true);
  assert.equal(isKnockoutCup('conference'), true);
  assert.equal(isKnockoutCup('Conference League'), true);
  assert.equal(isKnockoutCup('ECL'), true);
  assert.equal(isKnockoutCup('coppaitalia'), true);
  assert.equal(isKnockoutCup('Copa Italia'), true);
  assert.equal(isKnockoutCup('CI'), true);

  // 3 New Domestic Cups
  assert.equal(isKnockoutCup('facup'), true);
  assert.equal(isKnockoutCup('FA Cup'), true);
  assert.equal(isKnockoutCup('copadelrey'), true);
  assert.equal(isKnockoutCup('Copa del Rey'), true);
  assert.equal(isKnockoutCup('dfbpokal'), true);
  assert.equal(isKnockoutCup('DFB-Pokal'), true);
  assert.equal(isKnockoutCup('dfb pokal'), true);

  // League competitions where team is fixed and survivor mechanics do not apply
  assert.equal(isKnockoutCup('premier'), false);
  assert.equal(isKnockoutCup('Premier League'), false);
  assert.equal(isKnockoutCup('laliga'), false);
  assert.equal(isKnockoutCup('LaLiga'), false);
  assert.equal(isKnockoutCup('seriea'), false);
  assert.equal(isKnockoutCup('Serie A'), false);
  assert.equal(isKnockoutCup('bundesliga'), false);
  assert.equal(isKnockoutCup('Bundesliga'), false);
});

// -------------------------------------------------------------
// Scenario 8: Knockout Match Detection for all 7 competitions
// -------------------------------------------------------------
const { isKnockoutMatch, getKnockoutCupSlug, getKnockoutRound } = await import('../src/lib/leagueConfig.ts');
const { getTeamCups } = await import('../src/lib/survivor.ts');

runTest('Scenario 8: Knockout Match Detection by League Name (Domestic & European)', () => {
  assert.equal(isKnockoutMatch('Arsenal', 'Chelsea', 'FA Cup'), true);
  assert.equal(isKnockoutMatch('Real Madrid', 'Barcelona', 'Copa del Rey'), true);
  assert.equal(isKnockoutMatch('Bayern Munich', 'Dortmund', 'DFB-Pokal'), true);
  assert.equal(isKnockoutMatch('Bayern Munich', 'Dortmund', 'DFB Pokal'), true);
  assert.equal(isKnockoutMatch('Inter Milan', 'Juventus', 'Copa Italia'), true);
  assert.equal(isKnockoutMatch('Arsenal', 'Chelsea', 'Premier League'), false);
  assert.equal(isKnockoutMatch('Real Madrid', 'Barcelona', 'LaLiga'), false);
  // Fase liga europea (sep-ene) NO es KO
  assert.equal(isKnockoutMatch('Real Madrid', 'Barcelona', 'Champions League', '2026-11-03'), false);
  assert.equal(isKnockoutMatch('Arsenal', 'Chelsea', 'Europa League', '2026-10-01'), false);
  assert.equal(isKnockoutMatch('Como', 'Napoli', 'Conference League', '2026-12-10'), false);
  // Rondas KO europeas (feb+) SÍ son KO aunque los cruces sean TBD
  assert.equal(isKnockoutMatch('TBD Home', 'TBD Away', 'Champions League', '2027-02-17'), true);
  assert.equal(isKnockoutMatch('TBD Home', 'TBD Away', 'Europa League', '2027-03-11'), true);
  assert.equal(isKnockoutMatch('TBD Home', 'TBD Away', 'Conference League', '2027-04-08'), true);
  assert.equal(isKnockoutMatch('TBD Home', 'TBD Away', 'Champions League', '2027-05-31'), true);
});

// -------------------------------------------------------------
// Scenario 9: getKnockoutCupSlug helper
// -------------------------------------------------------------
runTest('Scenario 9: getKnockoutCupSlug Slug Mapping', () => {
  assert.equal(getKnockoutCupSlug('Champions League'), 'champions');
  assert.equal(getKnockoutCupSlug('Europa League'), 'europa');
  assert.equal(getKnockoutCupSlug('Conference League'), 'conference');
  assert.equal(getKnockoutCupSlug('Copa Italia'), 'coppaitalia');
  assert.equal(getKnockoutCupSlug('FA Cup'), 'facup');
  assert.equal(getKnockoutCupSlug('Copa del Rey'), 'copadelrey');
  assert.equal(getKnockoutCupSlug('DFB-Pokal'), 'dfbpokal');
  assert.equal(getKnockoutCupSlug('Premier League'), null);
});

// -------------------------------------------------------------
// Scenario 10: getKnockoutRound Real Round Names
// -------------------------------------------------------------
runTest('Scenario 10: getKnockoutRound Date to Round Resolution', () => {
  // Formato 2026/27 (36 equipos): feb = playoff R32, mar = R16, abr = QF, abr-may = SF, may = F
  assert.equal(getKnockoutRound('2026-02-18', 'champions'), 'Dieciseisavos de Final');
  assert.equal(getKnockoutRound('2026-03-11', 'champions'), 'Octavos de Final');
  assert.equal(getKnockoutRound('2026-04-08', 'champions'), 'Cuartos de Final');
  assert.equal(getKnockoutRound('2026-05-01', 'champions'), 'Semifinal');
  assert.equal(getKnockoutRound('2026-05-20', 'champions'), 'Final');
  assert.equal(getKnockoutRound('2026-05-30', 'champions'), 'Final');

  assert.equal(getKnockoutRound('2026-01-10', 'facup'), 'Tercera Ronda');
  assert.equal(getKnockoutRound('2026-02-05', 'facup'), 'Cuarta Ronda');
  assert.equal(getKnockoutRound('2026-03-01', 'facup'), 'Quinta Ronda');
  assert.equal(getKnockoutRound('2026-04-10', 'facup'), 'Cuartos de Final');

  assert.equal(getKnockoutRound('2026-12-15', 'copadelrey'), 'Dieciseisavos');
  assert.equal(getKnockoutRound('2026-01-20', 'copadelrey'), 'Octavos de Final');
  assert.equal(getKnockoutRound('2026-02-10', 'copadelrey'), 'Cuartos de Final');

  assert.equal(getKnockoutRound('2026-08-15', 'dfbpokal'), 'Primera Ronda');
  assert.equal(getKnockoutRound('2026-10-28', 'dfbpokal'), 'Segunda Ronda');
});

// -------------------------------------------------------------
// Scenario 11: getTeamCups Auto-Subscription Mapping (89 Clubs)
// -------------------------------------------------------------
runTest('Scenario 11: getTeamCups Auto-Subscription Mapping', () => {
  const sorted = (cups) => [...cups].sort();
  const rmCups = getTeamCups('Real Madrid');
  assert.deepEqual(sorted(rmCups), ['champions', 'copadelrey']);

  const arsCups = getTeamCups('Arsenal');
  assert.deepEqual(sorted(arsCups), ['champions', 'facup']);

  const bayCups = getTeamCups('Bayern Munich');
  assert.deepEqual(sorted(bayCups), ['champions', 'dfbpokal']);

  const intCups = getTeamCups('Inter Milan');
  assert.deepEqual(sorted(intCups), ['champions', 'coppaitalia']);

  const sevCups = getTeamCups('Sevilla');
  assert.deepEqual(sevCups, ['copadelrey']);

  const covCups = getTeamCups('Coventry City');
  assert.deepEqual(covCups, ['facup']);

  const hsvCups = getTeamCups('Hamburger SV');
  assert.deepEqual(hsvCups, ['dfbpokal']);
});

// -------------------------------------------------------------
// Scenario 12: Penalty Shootout Progression
// -------------------------------------------------------------
runTest('Scenario 12: Penalty Shootout Winner Progression', () => {
  // Tie ended 1-1, but Arsenal won on penalties. User predicted Arsenal to advance.
  const result = evaluateSurvivorProgression({
    activeTeamName: 'Paris Saint-Germain',
    predictedWinner: 'Arsenal',
    actualWinner: 'Arsenal', // Resolved from penalty shootout winner
    matchId: 'match-cl-penalties',
    roundName: 'Cuartos de Final',
    matchDate: '2026-04-15',
    currentHistory: [],
  });

  assert.equal(result.newStatus, 'ALIVE');
  assert.equal(result.newTeamName, 'Arsenal');
  assert.equal(result.transferred, true);
  assert.equal(result.updatedHistory.length, 1);
  assert.equal(result.updatedHistory[0].from_team, 'Paris Saint-Germain');
  assert.equal(result.updatedHistory[0].to_team, 'Arsenal');
});

console.log('\n------------------------------------------------------------');
console.log(` ✨ ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! ✨`);
console.log('------------------------------------------------------------\n');
