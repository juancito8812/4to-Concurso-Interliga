# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol con autenticación, tablas de posiciones por liga, y sistema de ranking para la temporada 2026/27.

## Stack clave

- Next.js 16 + App Router + static export (`output: "export"`)
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto
- Supabase (auth + PostgreSQL)
- `football-data.org` API + bundle oficial de 1.406 partidos 2026/27 (`src/data/officialFixtures.json`)
- Base de datos oficial de 3.031 jugadores 2026/27 de 95 clubes (`src/data/officialPlayers.json`)
- ESPN API para tablas de clasificación en vivo

## Archivos importantes

- `src/app/page.tsx` — Landing principal con selector de equipo
- `src/app/globals.css` — Paleta de colores (navy + gold)
- `src/app/Navbar.tsx` — Navbar con estado de auth
- `src/app/Footer.tsx` — Footer completo
- `src/app/providers.tsx` — AuthProvider wrapper
- `src/app/TeamSelectorCard.tsx` — Selección de equipo (bloqueada una vez elegida)
- `src/app/CompetitionStatusCard.tsx` — Estado VIVO/KO
- `src/app/pronosticar/page.tsx` — Tarjetas estilo transmisión TV con panel de goleadores en 2 columnas y plantillas actualizadas
- `src/app/mis-pronosticos/page.tsx` — Historial con logos y desglose de puntos
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación por liga (ESPN API)
- `src/data/officialFixtures.json` — 1.406 partidos oficiales 2026/27 pre-sincronizados
- `src/data/officialPlayers.json` — 3.031 jugadores 2026/27 de 95 clubes con posiciones traducidas
- `src/lib/supabase.ts` — Cliente Supabase
- `src/lib/leagueConfig.ts` — Colores, logos, normalizadores `normalizeMatchLeague` y `normalizeTeamName`
- `src/lib/footballData.ts` — `getOfficialTeamMatches`, `getOfficialPlayersForTeams` con API en vivo + fallback
- `src/contexts/AuthContext.tsx` — Context de autenticación
- `next.config.ts` — basePath para GitHub Pages

## Autenticación y Datos

- Registro, login, recuperación de contraseña via Supabase Auth
- Perfil extendido en tabla `profiles` con `team_id` FK → teams
- Pronósticos en tabla `predictions` con `prediction_scorers`
- Rutas protegidas: `/perfil`, `/pronosticar`, `/mis-pronosticos`
- Team locked once chosen (no se puede cambiar)

## Funcionalidades y Reglas de Pronósticos

- Selección de equipo bloqueada una vez elegida.
- Pronósticos filtrados por el equipo del usuario (exactamente los 3 siguientes partidos oficiales).
- Diseño estilo transmisión oficial de TV: cabecera con logo y color de competencia + cuenta regresiva dinámica.
- Marcador central TV con inputs numéricos de puntuación.
- Goleadores en 2 columnas simétricas directamente debajo de cada equipo (dropdown con plantilla oficial 2026/27 clasificada por posición + stepper progresivo de goles `⚽ [-] 1 [+]` al seleccionar jugador).
- Cierre exacto a los **10 minutos antes del partido** (`diffMin <= 10`).
- Re-edición permitida libremente antes del cierre (`diffMin > 10`).
- Detección precisa de competiciones europeas (`normalizeMatchLeague`) y mapeo canónico de clubes (`normalizeTeamName`).

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
```
