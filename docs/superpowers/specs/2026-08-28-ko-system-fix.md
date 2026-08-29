# Fix Sistema KO + 3 Copas Nuevas — 4° Concurso Interliga

## Contexto

Proyecto: Next.js 16 + Supabase + ESPN API. Concurso de pronósticos de fútbol con mecánica de "superviviente" en copas knockout.

El sistema KO actual solo cubre 4 competiciones (Champions, Europa, Conference, Coppa Italia). Se debe expandir a 7 competiciones y corregir 3 bugs.

## Competiciones KO finales (7)

| # | Competición | País | ESPN slug | Detección |
|---|---|---|---|---|
| 1 | Champions League | Europa | `uefa.champions` | Ya existe (knockoutPairs) |
| 2 | Europa League | Europa | `uefa.europa` | Ya existe (knockoutPairs) |
| 3 | Conference League | Europa | `uefa.europa.conf` | Ya existe (knockoutPairs) |
| 4 | Coppa Italia | Italia | `ita.coppa_italia` | `league.includes("copa italia")` |
| 5 | FA Cup | Inglaterra | `eng.fa` | `league.includes("fa cup")` |
| 6 | Copa del Rey | España | `esp.copa_del_rey` | `league.includes("copa del rey")` |
| 7 | DFB-Pokal | Alemania | `ger.dfb_pokal` | `league.includes("dfb-pokal") \|\| league.includes("dfb pokal")` |

## Bugs a corregir

1. **Empates con penales ignorados**: partidos KO que terminan empatados se skipean. Necesitan resolver el ganador vía endpoint de detalles de ESPN.
2. **Detección de copas domésticas**: sin pares pre-enumerados. Detección por nombre de competición.
3. **roundName hardcodeado**: siempre "Ronda KO". Debe mostrar la ronda real (Octavos, Cuartos, Semi, Final).

## Mecánica de supervivencia (reglas del usuario)

1. Cada equipo que juegue competiciones KO, si pierde, queda fuera
2. Si predices en contra de tu equipo y ganas, sigues con el equipo que escogiste
3. Si el equipo que escogiste pierde, estás fuera — pero si predices en contra y gana el equipo que dijiste, sigues con ese equipo
4. Cuando tu equipo no compite en ninguna competencia KO, no puedes competir

## Suscripción automática

Cuando el usuario elige su equipo en el landing page, se le suscribe automáticamente a TODAS las copas KO donde ese equipo compite. No hay selección manual por copa.

## Archivos a modificar

1. `src/data/teamAliases.json` — nuevo campo `teamCups`
2. `src/lib/leagueConfig.ts` — `isKnockoutMatch()`, `isKnockoutCup()`, `getKnockoutCupSlug()`, nueva `getKnockoutRound()`
3. `src/lib/survivor.ts` — `KNOCKOUT_CUP_SLUGS` +3, nueva `getTeamCups()`
4. `scripts/auto-sync-espn-results.js` — `LEAGUE_MAP` +3, `resolvePenaltyWinner()`, roundName real en `evaluateSurvivors()`
5. `scripts/lib/score-utils.js` — espejo de leagueConfig.ts
6. `src/app/TeamSelectorCard.tsx` — auto-suscripción después de `handleSelect()`
7. `src/app/pronosticar/page.tsx` — eliminar dropdown manual de cups, mostrar badge de copa
8. `src/app/mis-pronosticos/page.tsx` — roundName real
9. `scripts/test-survivor.js` — tests nuevos
10. `supabase/schema.sql` — comentario actualizado
11. `AGENTS.md`, `CLAUDE.md`, `README.md` — documentación

---

## Instrucciones por archivo

### 1. `src/data/teamAliases.json`

Agregar campo `teamCups` después de `knockoutPairs`. Mapeo de los 89 equipos a sus copas KO:

```json
"teamCups": {
  "Real Madrid": ["champions", "copadelrey", "supercopaespana"],
  "Barcelona": ["champions", "copadelrey", "supercopaespana"],
  "Atlético Madrid": ["champions", "copadelrey", "supercopaespana"],
  "Athletic Bilbao": ["copadelrey"],
  "Real Sociedad": ["copadelrey"],
  "Real Betis": ["copadelrey"],
  "Real Valladolid": ["copadelrey"],
  "Villarreal": ["copadelrey"],
  "Sevilla": ["copadelrey"],
  "Valencia": ["copadelrey"],
  "Celta Vigo": ["copadelrey"],
  "Getafe": ["copadelrey"],
  "Osasuna": ["copadelrey"],
  "Mallorca": ["copadelrey"],
  "Rayo Vallecano": ["copadelrey"],
  "Alavés": ["copadelrey"],
  "Girona": ["copadelrey"],
  "Las Palmas": ["copadelrey"],
  "Leganés": ["copadelrey"],
  "Espanyol": ["copadelrey"],
  "Elche": ["copadelrey"],
  "Almería": ["copadelrey"],
  "Arsenal": ["champions", "facup"],
  "Manchester City": ["champions", "facup"],
  "Liverpool": ["champions", "facup"],
  "Aston Villa": ["champions", "facup"],
  "Tottenham": ["champions", "facup"],
  "Chelsea": ["champions", "facup"],
  "Manchester United": ["champions", "facup"],
  "Newcastle": ["champions", "facup"],
  "Brighton": ["facup"],
  "West Ham": ["facup"],
  "Bournemouth": ["facup"],
  "Fulham": ["facup"],
  "Brentford": ["facup"],
  "Crystal Palace": ["facup"],
  "Wolves": ["facup"],
  "Everton": ["facup"],
  "Nott. Forest": ["facup"],
  "Ipswich Town": ["facup"],
  "Leicester City": ["facup"],
  "Southampton": ["facup"],
  "Bayern Munich": ["champions", "dfbpokal", "dflsupercup"],
  "Borussia Dortmund": ["champions", "dfbpokal", "dflsupercup"],
  "Bayer Leverkusen": ["champions", "dfbpokal", "dflsupercup"],
  "RB Leipzig": ["champions", "dfbpokal", "dflsupercup"],
  "Eintracht Frankfurt": ["champions", "dfbpokal"],
  "Stuttgart": ["dfbpokal"],
  "Wolfsburg": ["dfbpokal"],
  "Freiburg": ["dfbpokal"],
  "Mainz": ["dfbpokal"],
  "Borussia Mönchengladbach": ["dfbpokal"],
  "Hoffenheim": ["dfbpokal"],
  "Union Berlin": ["dfbpokal"],
  "Werder Bremen": ["dfbpokal"],
  "Augsburg": ["dfbpokal"],
  "Heidenheim": ["dfbpokal"],
  "Darmstadt": ["dfbpokal"],
  "Bochum": ["dfbpokal"],
  "Köln": ["dfbpokal"],
  "Düsseldorf": ["dfbpokal"],
  "Holstein Kiel": ["dfbpokal"],
  "Inter Milan": ["champions", "coppaitalia", "supercoppaitaliana"],
  "AC Milan": ["champions", "coppaitalia", "supercoppaitaliana"],
  "Juventus": ["champions", "coppaitalia", "supercoppaitaliana"],
  "Napoli": ["champions", "coppaitalia", "supercoppaitaliana"],
  "Atalanta": ["champions", "coppaitalia", "supercoppaitaliana"],
  "Lazio": ["coppaitalia", "supercoppaitaliana"],
  "Roma": ["coppaitalia", "supercoppaitaliana"],
  "Fiorentina": ["coppaitalia", "supercoppaitaliana"],
  "Bologna": ["coppaitalia", "supercoppaitaliana"],
  "Torino": ["coppaitalia"],
  "Monza": ["coppaitalia"],
  "Genoa": ["coppaitalia"],
  "Cagliari": ["coppaitalia"],
  "Udinese": ["coppaitalia"],
  "Sassuolo": ["coppaitalia"],
  "Empoli": ["coppaitalia"],
  "Lecce": ["coppaitalia"],
  "Parma": ["coppaitalia"],
  "Verona": ["coppaitalia"],
  "Como": ["coppaitalia"],
  "Venezia": ["coppaitalia"],
  "Frosinone": ["coppaitalia"],
  "Salernitana": ["coppaitalia"],
  "Paris Saint-Germain": ["champions"],
  "Benfica": ["champions"],
  "Porto": ["champions"],
  "AZ Alkmaar": ["europa"],
  "Dinamo Zagreb": ["conference"],
  "Genk": ["conference"],
  "Olympique Lyon": ["europa"],
  "PAOK": ["conference"],
  "Club Brujas": ["conference"]
}
```

### 2. `src/lib/leagueConfig.ts`

**a) `isKnockoutMatch()` — línea 113:**

Reemplazar la función completa por:

```typescript
export function isKnockoutMatch(homeTeam: string, awayTeam: string, league?: string): boolean {
  // 1. Verificar por pares pre-enumerados (Champions, Europa, Conference)
  const cHome = cleanTeamName(homeTeam);
  const cAway = cleanTeamName(awayTeam);
  const pairKey = `${cHome}-${cAway}`;
  if (conferenceKeyPairs.has(pairKey)) return true;
  if (europaKeyPairs.has(pairKey)) return true;
  if (championsKeyPairs.has(pairKey)) return true;

  // 2. Verificar por nombre de competición (copas domésticas)
  if (league) {
    const lower = league.toLowerCase();
    if (lower.includes("copa italia") || lower.includes("coppa")) return true;
    if (lower.includes("fa cup")) return true;
    if (lower.includes("copa del rey")) return true;
    if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return true;
  }
  return false;
}
```

**b) `isKnockoutCup()` — línea 29:**

Agregar los 3 nuevos slugs:

```typescript
export function isKnockoutCup(leagueOrSlug: string): boolean {
  const norm = leagueOrSlug.toLowerCase().trim();
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
```

**c) Agregar nueva función `getKnockoutRound()`:**

```typescript
/**
 * Returns the real round name for a knockout match based on date and tournament.
 */
export function getKnockoutRound(matchDate: string, tournamentSlug: string): string {
  if (!matchDate) return "Ronda KO";
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) return "Ronda KO";

  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (tournamentSlug === "champions") {
    if (month === 2 || (month === 3 && day <= 15)) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "europa") {
    if (month === 2) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "conference") {
    if (month === 2) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
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
    if (month === 2 || (month === 3 && day <= 10)) return "Quinta Ronda";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "copadelrey") {
    if (month === 12) return "Dieciseisavos";
    if (month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 4) return "Final";
  }
  if (tournamentSlug === "dfbpokal") {
    if (month <= 8) return "Primera Ronda";
    if (month === 9 || month === 10) return "Segunda Ronda";
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 5) return "Final";
  }
  return "Ronda KO";
}
```

### 3. `src/lib/survivor.ts`

**a) `KNOCKOUT_CUP_SLUGS` — línea 26:**

```typescript
export const KNOCKOUT_CUP_SLUGS = ["champions", "europa", "conference", "coppaitalia", "facup", "copadelrey", "dfbpokal"] as const;
```

**b) Agregar nueva función `getTeamCups()`:**

```typescript
import teamAliasesData from "../data/teamAliases.json";

export function getTeamCups(teamName: string): string[] {
  const cups = (teamAliasesData as any).teamCups?.[teamName];
  return Array.isArray(cups) ? cups : [];
}
```

### 4. `scripts/auto-sync-espn-results.js`

**a) `LEAGUE_MAP` — agregar 3 entradas:**

```javascript
const LEAGUE_MAP = {
  // ... existentes ...
  "eng.fa": "FA Cup",
  "esp.copa_del_rey": "Copa del Rey",
  "ger.dfb_pokal": "DFB-Pokal",
};
```

**b) `LEAGUES` array — agregar 3 slugs nuevos:**

```javascript
const LEAGUES = [
  // ... existentes ...
  "eng.fa",
  "esp.copa_del_rey",
  "ger.dfb_pokal",
];
```

**c) Nueva función `resolvePenaltyWinner()`:**

```javascript
async function resolvePenaltyWinner(gameId, espnSlug) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/summary?event=${gameId}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const game = data?.gameInfo || data?.header?.competitions?.[0];
    if (!game) return null;

    const penalties = data?.penalties;
    if (penalties && Array.isArray(penalties)) {
      const winner = penalties.find(p => p.winner);
      if (winner) return winner.team?.displayName || winner.team?.name || null;
    }

    const competitors = game.competitors || [];
    for (const c of competitors) {
      if (c.winner === true) {
        return c.team?.displayName || c.team?.name || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
```

**d) En `evaluateSurvivors()` — línea 233 (empatados):**

Reemplazar:
```javascript
if (match.result_home === match.result_away || p.home_score === p.away_score) continue;
```

Por:
```javascript
if (match.result_home === match.result_away) {
  const penWinner = await resolvePenaltyWinner(match.id, getEspnSlug(match.league));
  if (!penWinner) continue;
  match._penaltyWinner = penWinner;
}
if (p.home_score === p.away_score) continue;
```

Y línea 235, reemplazar:
```javascript
const actualWinner = match.result_home > match.result_away ? match.home_team : match.away_team;
```

Por:
```javascript
const actualWinner = match._penaltyWinner || (match.result_home > match.result_away ? match.home_team : match.away_team);
```

**e) Línea 243 y 282 (roundName):**

Reemplazar `"Ronda KO"` por `getKnockoutRound(match.match_date, getKnockoutCupSlug(match.league))`.

**f) Funciones helper necesarias:**

```javascript
function getEspnSlug(league) {
  if (!league) return null;
  const lower = league.toLowerCase();
  if (lower.includes("fa cup")) return "eng.fa";
  if (lower.includes("copa del rey")) return "esp.copa_del_rey";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "ger.dfb_pokal";
  if (lower.includes("copa italia") || lower.includes("coppa")) return "ita.coppa_italia";
  if (lower.includes("champions")) return "uefa.champions";
  if (lower.includes("europa") && !lower.includes("conference")) return "uefa.europa";
  if (lower.includes("conference")) return "uefa.europa.conf";
  return null;
}

function getKnockoutCupSlug(league) {
  if (!league) return null;
  const lower = league.toLowerCase();
  if (lower.includes("champions")) return "champions";
  if (lower.includes("europa") && !lower.includes("conference")) return "europa";
  if (lower.includes("conference")) return "conference";
  if (lower.includes("copa italia") || lower.includes("coppa")) return "coppaitalia";
  if (lower.includes("fa cup")) return "facup";
  if (lower.includes("copa del rey")) return "copadelrey";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "dfbpokal";
  return null;
}

function getKnockoutRound(matchDate, tournamentSlug) {
  if (!matchDate) return "Ronda KO";
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) return "Ronda KO";
  const month = d.getMonth() + 1;
  const day = d.getDate();

  if (tournamentSlug === "champions") {
    if (month === 2 || (month === 3 && day <= 15)) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "europa") {
    if (month === 2) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "conference") {
    if (month === 2) return "Octavos de Final";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
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
    if (month === 2 || (month === 3 && day <= 10)) return "Quinta Ronda";
    if (month === 3 || month === 4) return "Cuartos de Final";
    if (month === 4 || month === 5) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "copadelrey") {
    if (month === 12) return "Dieciseisavos";
    if (month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 4) return "Final";
  }
  if (tournamentSlug === "dfbpokal") {
    if (month <= 8) return "Primera Ronda";
    if (month === 9 || month === 10) return "Segunda Ronda";
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 5) return "Final";
  }
  return "Ronda KO";
}
```

### 5. `scripts/lib/score-utils.js`

Agregar las mismas funciones helper (`getEspnSlug`, `getKnockoutCupSlug`, `getKnockoutRound`) y actualizar `isKnockoutMatch` con la detección por nombre de competición.

### 6. `src/app/TeamSelectorCard.tsx`

Después de `handleSelect()`, agregar auto-suscripción:

```typescript
import { getTeamCups, setInitialCupSurvivor } from "../lib/survivor";

// Dentro de handleSelect, después de setTeamLocked(true):
const cups = getTeamCups(team.name);
for (const cupSlug of cups) {
  await setInitialCupSurvivor(user.id, cupSlug, teamId);
}
console.log(`Auto-suscrito a ${cups.length} copas KO:`, cups);
```

### 7. `src/app/pronosticar/page.tsx`

- Eliminar el dropdown de selección manual de equipo por copa
- Si el usuario tiene cup record activo, mostrar badge de la copa con el equipo
- Si su equipo no participa en esa copa, no mostrar nada

### 8. `src/app/mis-pronosticos/page.tsx`

Reemplazar `"Ronda KO"` por `getKnockoutRound(match.match_date, cupSlug)`:

- Línea 442: `roundName: "Ronda KO"` → `roundName: getKnockoutRound(match.match_date, cupSlug)`
- Línea 459: `eliminatedAtRound = "Ronda KO"` → `eliminatedAtRound = getKnockoutRound(match.match_date, cupSlug)`
- Importar `getKnockoutRound` desde `leagueConfig`

### 9. `scripts/test-survivor.js`

Agregar tests para: FA Cup detection, Copa del Rey detection, DFB-Pokal detection, getKnockoutRound, getTeamCups, Penales (mock).

### 10. `supabase/schema.sql`

Actualizar comentario en línea 88:
```sql
tournament_slug TEXT NOT NULL, -- 'champions', 'europa', 'conference', 'coppaitalia', 'facup', 'copadelrey', 'dfbpokal'
```

### 11. Documentación

Actualizar `AGENTS.md`, `CLAUDE.md`, `README.md` con las 7 copas KO, suscripción automática y nuevo flujo de usuario.

---

## Verificación

1. `npx tsc --noEmit` — sin errores de tipos
2. `npm run build` — compila exitosamente
3. `node scripts/test-survivor.js` — todos los tests pasan
4. Verificar que `teamCups` cubre los 89 equipos de `canonicalDbTeams`
5. Verificar que `isKnockoutMatch` detecta las 7 copas
6. Verificar que `getKnockoutRound` retorna rounds correctos para fechas 2026/27
