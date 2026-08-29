# Memoria del Proyecto: 4to-Concurso-Interliga

## Información General

- **Propósito:** Aplicación web para el 4° Concurso de pronósticos de fútbol (temporada 2026-27). Permite elegir equipo, pronosticar resultados y goleadores de 8 ligas/copas europeas, ver clasificaciones y competir en el ranking general.
- **Stack:** Next.js 16.3.2 (App Router, static export), React 19, Tailwind CSS v4, TypeScript 5, Supabase (Auth + PostgreSQL), ESPN Public API.
- **Deploy:** GitHub Pages (`basePath: "/4to-Concurso-Interliga"`, workflow `.github/workflows/deploy.yml`).
- **Última sesión:** 2026-08-28 20:30
- **Versión de memoria:** 1.6

## Arquitectura

- `src/app/` — Páginas de Next.js (`/`, `/registro`, `/login`, `/olvide-contrasena`, `/perfil`, `/pronosticar`, `/mis-pronosticos`, `/ranking`, `/tabla/[league]`).
- `src/lib/survivor.ts` — Módulo de supervivencia multitorneo KO (`evaluateSurvivorProgression`, `getUserCupSurvivors`, `setInitialCupSurvivor`, `updateCupSurvivor`).
- `src/lib/espnApi.ts` — API client para estadísticas en vivo, clasificaciones y fixtures de las 8 competiciones sin restricciones de CORS ni límites de API key.
- `src/lib/scoring.ts` — Motor oficial de cálculo de puntuación (`calculateScore`) para aciertos de signo, marcador exacto, diferencia de 1 gol y goleadores.
- `src/lib/supabase.ts` — Cliente Supabase para profiles, teams, players, matches, predictions, prediction_scorers y tournament_survivors.
- `src/lib/leagueConfig.ts` — Colores de marca, normalizador unificado de nombres de equipos (`normalizeTeamName`) y logos de las 8 ligas.
- `src/contexts/AuthContext.tsx` — Context de autenticación, perfil en vivo, traducción inteligente de errores de auth (rate limits / spam protection) y eliminación de cuenta (`deleteAccount`).

## Decisiones Clave

- **2026-08-28** — **Traducción y gestión de Rate Limits de Supabase Auth en `src/contexts/AuthContext.tsx`**: Helper `translateAuthError` que traduce mensajes técnicos de Supabase (como `over_email_send_rate_limit`) a explicaciones claras en español sobre la pausa de seguridad de 1-2 minutos antes de reintentar registros.
- **2026-08-28** — **Cierre de pronósticos ajustado a 1 minuto antes del inicio (`diffMin <= 1`)**: Se modificó `checkIsMatchLocked` y `calculateTimeRemaining` en `src/app/pronosticar/page.tsx` para permitir pronósticos y re-ediciones hasta 1 minuto antes del pitazo inicial de cada partido.
- **2026-08-28** — **Sistema de Sobreviviente y Herencia de Camisetas en Copas Knockout (`tournament_survivors`)**: Tabla dedicada en PostgreSQL con RLS y campo `history` JSONB para registrar transferencias de club al acertar victorias del rival en copas de eliminación directa.
- **2026-08-28** — **Sincronización exacta con calendario en vivo (1.842 partidos y 3.822 jugadores 2026/27)**: Se integró y validó el calendario oficial en vivo alineado con la jornada activa de la temporada 2026/27 (*Bayern Munich vs Stuttgart* hoy viernes a las 18:30 UTC / 20:30 CEST en Bundesliga, *Crystal Palace vs Manchester City* en Premier League, *AC Milan vs Venezia* en Serie A, *Alavés vs Betis* en LaLiga) en `src/data/officialFixtures.json`.
- **2026-08-28** — **Pestaña "Partidos" en todas las ligas (`TablaLigaClient.tsx`)**: Se habilitó la pestaña de calendario/partidos no solo para copas sino para las 8 competiciones con resolución en vivo de ESPN y fallback al bundle oficial.
- **2026-08-26** — **Migración a ESPN API pública en `src/lib/espnApi.ts`**: Resuelve el problema de CORS en GitHub Pages que tenía `football-data.org` (que devolvía `Access-Control-Allow-Origin: http://localhost`) y da soporte completo a Europa League, Conference League y Copa Italia.
- **2026-08-26** — **Motor de scoring en `src/lib/scoring.ts`**: Implementa las 5 reglas de puntuación con normalización de nombres de jugadores (tildes/mayúsculas) para calcular puntos tanto en `/mis-pronosticos` como en `/ranking`.
- **2026-08-26** — **Consultas desacopladas en Supabase (`src/app/ranking/page.tsx`)**: Se reemplazó la consulta unida `select("..., profiles(display_name)")` (que fallaba con `PGRST200`) por consultas independientes coordinadas por `user_id`.

- **2026-08-28** — **Arquitectura 100% Automática de Resultados y Puntuación**:
  - **Capa Cliente en Vivo (`src/lib/espnResultsFetcher.ts`)**: Consulta la API de ESPN Scoreboard en tiempo real con caché de 30s para obtener partidos finalizados (`completed: true`), marcadores y goleadores oficiales directamente en el navegador del usuario al abrir `/ranking` o `/mis-pronosticos`.
  - **Capa Servidor/Cron (`.github/workflows/auto-evaluate-matches.yml` + `scripts/auto-sync-espn-results.js`)**: Ejecución programada cada 2 horas en GitHub Actions para extraer resultados de las 8 competiciones, actualizar `officialEvaluatedMatches.json`, calcular puntos de todos los usuarios y commitear automáticamente.

## Estado Actual

- **Branch:** `main` (desplegado a GitHub Pages).
- **Build Status:** `npm run build` y `npm run lint` pasando con 0 errores (19 rutas estáticas generadas).
- **Deploy:** GitHub Actions activado con éxito en `main`.
- **Automatización:** 100% desatendida (cliente en vivo + cron de fondo + persistencia Supabase vía RPC).

## Cambios Recientes

- **2026-08-28** — **Cadena de puntuación 100% automática end-to-end (revisión integral)**:
  - **Fix crítico de IDs aleatorios** en `src/lib/footballData.ts`: `Number(uuid) || Math.random()` hacía que cada carga de página generara un id distinto y ningún pronóstico nuevo pudiera puntuarse. Ahora se preserva el id canónico del fixture y el path de API en vivo re-mapea el fixture por nombres.
  - **IDs unificados en toda la cadena**: cron, fetcher cliente y evaluador usan siempre `matchIdToUuid(fixture.id | evento)`; join por nombres como fallback en ranking/mis-pronosticos/cron.
  - **Módulo compartido `scripts/lib/score-utils.js`** (normalizeTeamName con alias completo, matchIdToUuid, matching fonético, calculateScore, isKnockoutMatch, evaluateSurvivorProgression) + datos extraídos a `src/data/teamAliases.json` (aliasMap, canonicalDbTeams, knockoutPairs).
  - **Fix de FK crítica**: `predictions.match_id` referenciaba `matches(id)` con UUIDs aleatorios → ningún pronóstico podía guardarse en Supabase. Se re-sembró `matches` con los 1.842 ids canónicos de `officialFixtures.json`.
  - **Fix de 34 IDs duplicados** en `officialFixtures.json` (placeholders compartidos por hasta 7 partidos): 169 ids regenerados determinísticamente (0 duplicados).
  - **RPCs `SECURITY DEFINER` en producción** (5): `update_match_results`, `update_prediction_points`, `upsert_fixture_matches`, `update_survivors` (+ `schema.sql`).
  - **Tabla `tournament_survivors` creada en producción** (faltaba migrar el DDL de schema.sql).
  - **Survivor automatizado server-side**: el cron evalúa la progresión KO (solo emparejamientos oficiales, idempotente por match_id en history) y persiste vía RPC; refuerzo client-side en `/mis-pronosticos`.
  - **Backfill de 3 días** en el cron (ESPN `?dates=YYYYMMDD,..`): no se pierden resultados si el job falla un día.
  - **Persistencia verificada end-to-end**: predicción de Milanarg (AC Milan 3-0 vs Venezia) = 5 PTS en JSON + Supabase (predictions, prediction_scorers, points vía RPC).
  - **Menores**: guard de nulos en merge Supabase, `AbortSignal.timeout` en fetcher ESPN, `goals ?? 0` en scoring, `npm ci` eliminado del workflow cron, loader JSON arreglado en `scripts/test-survivor.js` (7/7 tests OK).

- **2026-08-28** — **Auditoría en teléfono vía ADB/CDP + revisión a fondo de toda la lógica**:
  - Verificación en vivo (Samsung A12): landing, ranking (Milanarg 5 pts correctos), tabla LaLiga, login/registro/perfil, mis-pronosticos, pronosticar — todo OK.
  - **Fix "Invalid Date"** (`1920fd8`): fechas vacías muestran "Fecha por confirmar" en mis-pronosticos (aplica a todos los usuarios).
  - **Fix doble conteo de goleadores** (`15bca32`): ranking/mis-pronosticos deduplican scorers por (jugador, goles, equipo) cuando el pronóstico existe en JSON y Supabase a la vez.
  - **Fix CORS football-data en GitHub Pages** (`e065e2e`): `getOfficialTeamMatches` saltea la API en vivo fuera de localhost (la API solo permite localhost); se usa el bundle oficial. 0 errores en consola del teléfono.
  - **Fix recuperación de contraseña** (`22aed96`): creada la página `/actualizar-contrasena` (el redirect del email apuntaba a una ruta inexistente → 404).
  - **Fix reset de participación**: `handleResetData` en `/perfil` ahora borra también `tournament_survivors`.
  - ⚠️ ~~Acción manual pendiente~~ **RESUELTO**: URL agregada a Supabase vía Management API — `site_url` corregido a `https://juancito8812.github.io/4to-Concurso-Interliga` (antes apuntaba a localhost:3000, rompiendo los links de confirmación de registro en producción) y `uri_allow_list` con localhost + sitio + `/actualizar-contrasena`.

- **2026-08-28** — **Optimización + endurecimiento de Supabase con las skills oficiales** (`npx skills add supabase/agent-skills` + `supabase-postgres-best-practices`):
  - **🔴 Vulnerabilidad cerrada**: los RPCs del cron (`update_match_results`, `update_prediction_points`, `update_survivors`, `upsert_fixture_matches`, `get_meta`, `set_meta`) eran `SECURITY DEFINER` ejecutables por cualquiera con la anon key pública → ataque simulado confirmado (HTTP 204 modificaba puntos). Se ELIMINARON; el cron ahora escribe con la **service role key** (secreto GitHub `SUPABASE_SERVICE_ROLE_KEY`) vía REST directo (bypass RLS). Puntos manipulados en la prueba restaurados (999 → 5).
  - `search_path` fijo en `handle_new_user` y `delete_user_account` (WARN de advisors); `delete_user_account` solo para `authenticated`; `app_meta` sin grants para anon/authenticated (solo service role).
  - **Advisors finales**: solo WARNs intencionales (rls_auto_enable interno de Supabase, delete_user_account para auth, INFO app_meta sin políticas) + leaked password protection (solo desde dashboard — pendiente manual).
  - Cron verificado local con service key: evaluación OK, persistencia por PATCH por fila (corregido bug de batch con valores distintos), hash de calendario leído con service key.

- **2026-08-28**:
  - Implementación del sistema 100% automático de resultados y puntuación (ESPN API + GitHub Actions Cron).
  - Algoritmo de emparejamiento inteligente de jugadores (`arePlayersMatching`) con normalización fonética y variantes de nombres.
  - Evaluación y asignación oficial de 5 puntos a `Milanarg` (AC Milan vs Venezia).
  - Creación de almacén de partidos evaluados (`src/data/officialEvaluatedMatches.json` y `src/data/officialEvaluatedPredictions.json`).
  - Actualización de documentación ([`README.md`](file:///home/jr/Documentos/programacion/4to-Concurso-Interliga/README.md), [`CLAUDE.md`](file:///home/jr/Documentos/programacion/4to-Concurso-Interliga/CLAUDE.md), [`AGENTS.md`](file:///home/jr/Documentos/programacion/4to-Concurso-Interliga/AGENTS.md), [`DISASTER_RECOVERY_AND_SCHEMA.md`](file:///home/jr/Documentos/programacion/4to-Concurso-Interliga/DISASTER_RECOVERY_AND_SCHEMA.md)).
  - Explicación y mejora UX en `/mis-pronosticos` indicando que los puntos se calcularán al finalizar el partido.
  - Creación de `scripts/evaluate-matches.js`, `scripts/assign-points.js` y `scripts/auto-sync-espn-results.js`.
  - Traducción inteligente de errores de Supabase Auth en `src/contexts/AuthContext.tsx`.
  - Reducción del tiempo de cierre de pronósticos a 1 minuto antes del partido en `src/app/pronosticar/page.tsx`.
  - Implementación completa del plan de Superviviente Knockout (Tasks 1 a 6):
    - Migración DDL y RLS de `tournament_survivors` en `supabase/schema.sql` y `DISASTER_RECOVERY_AND_SCHEMA.md`.
    - Módulo de evaluación de supervivencia pura y helpers en `src/lib/survivor.ts`.
    - Suite de pruebas unitarias en `scripts/test-survivor.js` pasando con 100% de éxito.
    - Componente interactivo multitorneo en `CompetitionStatusCard.tsx`.
    - Integración de alertas, bloqueo KO y selector inicial en `src/app/pronosticar/page.tsx`.
    - Historial de superviviente, línea de tiempo de camisetas heredadas y badges en `src/app/mis-pronosticos/page.tsx`.
    - Documentación actualizada en `README.md`, `CLAUDE.md`, `AGENTS.md`, `DISASTER_RECOVERY_AND_SCHEMA.md` y `.agents/MEMORY.md`.
  - Sincronización del partido inaugural de hoy viernes de la Bundesliga (*Bayern Munich vs Stuttgart*, 18:30 UTC / 20:30 CEST) y jornadas oficiales de las 8 competiciones en `src/data/officialFixtures.json` (1.842 partidos oficiales).
  - Carga y normalización de 3.822 jugadores oficiales 2026/27 en `src/data/officialPlayers.json` (100% de los clubes con nómina completa de delanteros, medios, defensas y arqueros).

## Próximos Pasos / Ideas Futuras

- [ ] Cargar resultados reales de partidos conforme concluyan en la vida real para otorgar puntos.
- [ ] Opcional: Agregar selector de jornadas pasadas en las tablas de ligas.

