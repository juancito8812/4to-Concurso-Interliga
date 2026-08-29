# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol con autenticación, tablas de posiciones por liga, sistema de ranking en vivo y gestión de perfiles para la temporada 2026/27.

## Stack clave

- Next.js 16 + App Router + static export (`output: "export"`)
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto
- Supabase (Auth + PostgreSQL con RLS público y escrituras del cron vía **service role key**)
- `src/data/officialFixtures.json` — 1.842 partidos oficiales 2026/27 para las 8 competiciones (IDs canónicos únicos)
- `src/data/teamAliases.json` — Fuente única de normalización (aliasMap, canonicalDbTeams, knockoutPairs)
- `src/data/officialPlayers.json` — Base de datos oficial de 3.822 jugadores 2026/27 clasificados por posición
- ESPN API pública para tablas de clasificación, goleadores y partidos en vivo (CORS habilitado)
- Automatización: cron GitHub Actions cada 2h (`auto-evaluate-matches.yml` + `scripts/auto-sync-espn-results.js`)

## Archivos importantes

- `src/app/page.tsx` — Landing principal con selector de equipo y podio de premios
- `src/app/globals.css` — Paleta de colores (navy + gold)
- `src/app/Navbar.tsx` — Navbar con nombre de usuario dinámico y dropdown
- `src/app/Footer.tsx` — Footer completo
- `src/app/providers.tsx` — AuthProvider wrapper
- `src/app/TeamSelectorCard.tsx` — Selección y confirmación de club
- `src/app/CompetitionStatusCard.tsx` — Estado VIVO/KO
- `src/app/registro/page.tsx` — Registro con nombre de usuario obligatorio
- `src/app/login/page.tsx` — Inicio de sesión
- `src/app/olvide-contrasena/page.tsx` — Solicitud de recuperación de contraseña
- `src/app/actualizar-contrasena/page.tsx` — Página de destino del email de recuperación (nueva contraseña)
- `src/app/perfil/page.tsx` — Edición de nombre de usuario, reinicio de club (limpia survivors) y eliminación de cuenta
- `src/app/pronosticar/page.tsx` — Tarjetas estilo transmisión TV con ventana de 3 partidos y goleadores
- `src/app/mis-pronosticos/page.tsx` — Historial con logos, desglose de puntos y evaluación automática del survivor
- `src/app/ranking/page.tsx` — Ranking general en vivo con Podio de Honor y búsqueda
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación, goleadores y partidos por liga (ESPN API)
- `src/data/officialFixtures.json` — 1.842 partidos oficiales 2026/27 pre-sincronizados
- `src/data/teamAliases.json` — aliasMap + equipos canónicos + pares KO (consumido por TS y scripts)
- `src/data/officialPlayers.json` — 3.822 jugadores 2026/27 con posiciones y roles actualizados
- `src/data/officialEvaluatedMatches.json` — Resultados oficiales de partidos jugados y goleadores reales
- `src/data/officialEvaluatedPredictions.json` — Pronósticos evaluados y sincronizados (JSON + Supabase)
- `scripts/auto-sync-espn-results.js` — Cron: sincroniza ESPN → evalúa puntos/survivors → persiste en Supabase
- `scripts/evaluate-matches.js` — Evaluador CLI manual de partidos (usa `scripts/lib/score-utils.js`)
- `scripts/lib/score-utils.js` — Módulo compartido CJS: normalizeTeamName, matchIdToUuid, calculateScore, isKnockoutMatch, evaluateSurvivorProgression
- `scripts/test-survivor.js` — Suite de pruebas unitarias (7/7 PASS)
- `src/lib/supabase.ts` — Cliente Supabase
- `src/lib/survivor.ts` — Módulo de supervivencia multitorneo KO, evaluación de partidos (`evaluateSurvivorProgression`) y herencia de camisetas
- `src/lib/leagueConfig.ts` — Colores, logos, normalizadores `normalizeMatchLeague`, `normalizeTeamName`, `matchIdToUuid`, `isKnockoutMatch`
- `src/lib/scoring.ts` — Motor de cálculo de puntos (+ matching fonético `arePlayersMatching`)
- `src/lib/espnResultsFetcher.ts` — Fetcher cliente de partidos finalizados ESPN (caché 30s, timeout 10s)
- `src/lib/footballData.ts` — Plantillas oficiales + ventana de partidos (saltea API en vivo en GitHub Pages por CORS)
- `src/contexts/AuthContext.tsx` — Context de autenticación, sync de perfiles y `deleteAccount`
- `supabase/schema.sql` — Script DDL maestro (8 tablas, índices, RLS endurecido, triggers, 89 equipos, app_meta)
- `DISASTER_RECOVERY_AND_SCHEMA.md` — Manual de restauración paso a paso ante pérdida total
- `next.config.ts` — basePath para GitHub Pages

## Autenticación y Base de Datos

- Registro con nombre de usuario, login y recuperación de contraseña vía Supabase Auth.
- Política de contraseñas (plan Free): mínimo **8 caracteres** con mayúscula, número y símbolo (HIBP es solo Pro).
- Perfil extendido en tabla `profiles` (`user_id`, `display_name`, `team_id`).
- Trigger `handle_new_user` en Supabase crea automáticamente el perfil en el registro.
- Políticas RLS: lectura pública para `profiles`, `predictions`, `prediction_scorers`, `tournament_survivors`, `teams`, `players`, `matches`; **escritura solo del dueño** (prediction_scorers con EXISTS sobre predictions — IDOR fix).
- Tabla `app_meta` (clave-valor) solo accesible por service role (marca `fixtures_hash` del cron).
- **NO hay RPCs públicos de escritura** (eliminados): el cron escribe con la **service role key** (`SUPABASE_SERVICE_ROLE_KEY` — secreto de GitHub Actions) vía REST directo.
- RPC `delete_user_account` (solo `authenticated`) elimina cuenta, purga datos y libera el correo en `auth.users`.
- Rutas protegidas: `/perfil`, `/pronosticar`, `/mis-pronosticos`.

## Funcionalidades y Reglas de Pronósticos

- **Ventana de 3 Partidos:** `/pronosticar` muestra siempre los 3 próximos partidos no finalizados del equipo (IDs canónicos de fixture).
- **Cierre y Re-edición:** Cierre a **1 minuto antes del partido** (`diffMin <= 1`). Re-edición permitida libremente antes del cierre (`diffMin > 1`).
- **Goleadores:** Divididos en 2 columnas directamente debajo de cada equipo con selector numérico `[-] N [+]` (máx 3 goleadores en total por partido).
- **Ranking Multiusuario:** Podio de Honor dinámico (Oro 🥇, Plata 🥈, Bronce 🥉) con escudos oficiales, puntos reales y filtros (caché 60s).
- **Superviviente en Copas Knockout (Champions, Europa, Conference, Copa Italia):** Estado independiente por copa (`ALIVE` / `ELIMINATED`). Si el participante pronostica la victoria del rival y acierta, hereda la camiseta del rival para las siguientes fases (`history` JSONB), mientras su club base en liga regular permanece 100% fijo. Evaluación automática en el cron (server-side) y refuerzo client-side en `/mis-pronosticos`.

## Automatización (100%)

- **Cron cada 2h** (`.github/workflows/auto-evaluate-matches.yml`): ESPN (backfill 3 días) → actualiza `officialEvaluatedMatches.json` → evalúa puntos de JSON + Supabase → persiste resultados, puntos y survivors en Supabase con service role key.
- Sync de calendario solo cuando cambia `officialFixtures.json` (hash md5 en `app_meta`).
- Cliente: evaluación en vivo con ESPN y fallback a los JSON oficiales.

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
npm run lint     # Verificar ESLint
node scripts/test-survivor.js    # Tests del sistema de superviviente (7/7)
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/auto-sync-espn-results.js  # Cron local
```
