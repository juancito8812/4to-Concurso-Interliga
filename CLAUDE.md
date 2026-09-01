# CLAUDE.md

Contexto para agentes de código. Para documentación completa ver [README.md](./README.md). Reglas detalladas en [AGENTS.md](./AGENTS.md).

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol (temporada 2026/27) con autenticación, tablas de posiciones por liga, ranking en vivo y sistema de superviviente en copas knockout.

## Stack

- Next.js 16 + App Router + static export (`output: "export"`)
- Tailwind CSS v4 (`globals.css` con `@theme`)
- TypeScript 5 estricto
- Supabase (Auth + PostgreSQL con RLS)
- ESPN API (tablas, goleadores, partidos en vivo)
- Cron GitHub Actions cada 2h (`auto-evaluate-matches.yml`)

## Archivos Más Importantes

| Archivo | Propósito |
|---------|-----------|
| `src/app/page.tsx` | Landing con selector de equipo y podio de premios |
| `src/app/pronosticar/page.tsx` | Pronósticos estilo TV (ventana de 3 partidos) |
| `src/app/ranking/page.tsx` | Ranking multiusuario en vivo |
| `src/lib/leagueConfig.ts` | Normalización canónica de ligas/equipos, `matchIdToUuid`, colores |
| `src/lib/survivor.ts` | Motor de superviviente en 7 copas KO |
| `src/lib/scoring.ts` | Cálculo de puntos + matching fonético `arePlayersMatching` |
| `src/data/officialFixtures.json` | 1.650 partidos reales pre-sincronizados |
| `src/data/teamAliases.json` | 404 aliases, 241 equipos, 225 teamCups |
| `src/data/officialPlayers.json` | 4.749 jugadores clasificados por posición |
| `scripts/auto-sync-espn-results.js` | Cron: ESPN → evaluación → Supabase (service role key) |
| `scripts/verify-logic.js` | 43 checks de lógica de negocio |
| `supabase/schema.sql` | DDL maestro: 8 tablas, RLS, triggers |

## Base de Datos

- **RLS en todas las tablas**: lectura pública, escritura solo del dueño.
- **No existen RPCs públicos de escritura**: el cron usa service role key vía REST directo.
- Tablas: `teams` (225), `profiles`, `players`, `matches` (1.650), `predictions`, `prediction_scorers`, `tournament_survivors` (7 copas KO), `app_meta`.
- `delete_user_account` (SECURITY DEFINER): purga en cascada y libera email.

## Comandos

```bash
npm run build              # Build estático
npm run dev                # Desarrollo local
npm run lint               # ESLint
npx tsc --noEmit           # Type-checking
node scripts/verify-logic.js         # 43 checks de lógica
node scripts/validate-fixtures.js    # Validación de calendario
node scripts/test-survivor.js        # Tests superviviente (12/12)
```
