# Memoria del Proyecto: 4to-Concurso-Interliga

## Información General

- **Propósito:** Aplicación web para el 4° Concurso de pronósticos de fútbol (temporada 2026-27). Permite elegir equipo, pronosticar resultados y goleadores de 11 competiciones europeas, ver clasificaciones y competir en el ranking general.
- **Stack:** Next.js 16.3.2 (App Router, static export), React 19, Tailwind CSS v4, TypeScript 5, Supabase (Auth + PostgreSQL), ESPN Public API.
- **Deploy:** GitHub Pages con dominio personalizado `futbolcamisetapasion.com` (Cloudflare DNS), sin basePath. Workflow `.github/workflows/deploy.yml`.
- **Última sesión:** 2026-10-20 — cron de resultados a cada 30 min (antes 2 h) tras comprobar que GitHub retrasaba los runs y los partidos del día tardaban 4-6 h en puntuar; además, 2026-10-17 — anti-copia de pronósticos en la base (policies + RPC `get_public_predictions`, migración `20261017214000`) y limpieza de rendimiento (`929d8fa`/`715ed10`, migración `20261017220000`), con `main` en `08ee423` y CI verde; además la lógica de puntuación **arreglada, mergeada a `main` y verificada en producción**: `docs/SCORING_LOGIC.md` como fuente única de verdad + `scripts/verify-engine-parity.js` que prueba que el motor JS y el TS dan los mismos puntos — antes `verify-logic.js` solo probaba el JS; candado en CI (`verify.yml`) y en el deploy; rama `fix/logica-puntuacion-definitiva` rebasada sobre el cron `80f5c3c`, merge fast-forward y eliminada)
- **Versión de memoria:** 3.1

## Arquitectura

- `src/app/` — Páginas de Next.js (`/`, `/registro`, `/login`, `/olvide-contrasena`, `/actualizar-contrasena`, `/perfil`, `/pronosticar`, `/mis-pronosticos`, `/ranking`, `/tabla/[league]`).
- `src/lib/survivor.ts` — Módulo de supervivencia multitorneo KO (`evaluateSurvivorProgression`, `getUserCupSurvivors`, `setInitialCupSurvivor`, `upsertCupSurvivor`).
- `src/lib/espnApi.ts` — API client para estadísticas en vivo, clasificaciones y fixtures de las 11 competiciones sin restricciones de CORS ni límites de API key.
- `src/lib/scoring.ts` — Motor oficial de cálculo de puntuación (`calculateScore`) para aciertos de signo, marcador exacto, diferencia de 1 gol y goleadores.
- `src/lib/supabase.ts` — Cliente Supabase para profiles, teams, players, matches, predictions, prediction_scorers y tournament_survivors.
- `src/lib/leagueConfig.ts` — Colores de marca, normalizador unificado de nombres de equipos (`normalizeTeamName`) y logos de las 11 competiciones.
- `src/contexts/AuthContext.tsx` — Context de autenticación, perfil en vivo, traducción inteligente de errores de auth (rate limits / spam protection) y eliminación de cuenta (`deleteAccount`).

## Decisiones Clave

- **2026-10-17** — **Fix: producción no se sincronizaba tras los commits del cron (drift de 3 días)**:
  - **Síntoma**: `officialEvaluatedMatches.json` / `officialEvaluatedPredictions.json` correctos en `main` pero STALE en `futbolcamisetapasion.com` (verificado por md5). Último deploy real: 14/10, con el cron commiteando cada 2 h hasta el 17/10 sin desplegar.
  - **Causa raíz**: `deploy.yml` solo escucha `push` y los pushes de `github-actions[bot]` hechos con el `GITHUB_TOKEN` **no generan eventos de workflow** (limitación de GitHub para evitar recursión). El commit llegaba a `main`; el deploy nunca se disparaba.
  - **Fix** (PR #1, commit `24df969`): `auto-evaluate-matches.yml` y `auto-sync-squads.yml` añaden `permissions: actions: write` y un step final condicional (`steps.commit.outputs.changed == 'true'`) que ejecuta `gh workflow run deploy.yml --ref main` con `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`. `workflow_dispatch` es la única excepción que `GITHUB_TOKEN` sí puede disparar → **no hace falta PAT**.
  - **Verificación end-to-end**: workflow temporal de prueba en `main` → dispatch OK (run con `event=workflow_dispatch`); luego el cron real (`39059197930`) syncó 206 pts, commiteó `72d8aef` y disparó el deploy `39059225585` → success. md5 de los 4 JSON: OK contra producción.
  - **Pitfalls**: (1) `workflow_dispatch` solo funciona si el workflow está en la **rama por defecto** — dispararlo desde una rama nueva da `HTTP 404`; (2) el step de dispatch necesita `actions/checkout` (si no, `gh workflow run` falla por no tener contexto de repo).
  - **Lección**: un `push` de bot no equivale a un `push` humano en GitHub Actions. Cuando el CI depende de que un workflow dispare otro, usar `workflow_dispatch` explícito y verificar el **evento** del run, no solo que "hay un run nuevo".

- **2026-09-20** — **Bug de evaluación cerrado: resultado fabricado Levante-Athletic (0-0 del 16/09)**:
  - **Causa raíz (2 bugs encadenados en `scripts/auto-sync-espn-results.js`)**: (1) `findFixture` emparejaba evento ESPN → fixture por nombre SIN comprobar fecha ni liga, así que cuando football-data reprogramó el partido (ID FD `564685` → UUID `...89dcd`, status `TIMED`, nueva fecha 21/10), un evento ESPN de otra fecha se le atribuyó; (2) `parseInt(homeComp.score || "0")` fabricaba un 0-0 válido cuando el evento no traía marcador. Resultado: entrada `completed: true, result 0-0` para un partido **no jugado**, commiteada por el cron (`26b1590`).
  - **Auditoría completa**: cruce de los 215 evaluados vs 1.926 fixtures — **1 solo caso** (eliminado; quedan 214), 0 huérfanos. 0 predicciones evaluadas sobre ese ID (impacto en puntos: nulo).
  - **Fixes**: score estricto (`score ?? ""` → skip si falta) y `findFixture(officialFixtures, home, away, eventDate)` con ventana de ±3 días. Validado: sintaxis, `validate-fixtures.js` 0 errores, `verify-logic.js` 57/57.
  - **Lección**: al emparejar entidades entre fuentes por nombre, siempre incluir una restricción temporal; nunca defaultear marcadores ausentes a 0.

- **2026-09-20** — **Pase de performance (auditoría Lighthouse-style sobre out/)**:
  - `/ranking` carga **−117 KB de JS** (982→865 KB raw): `UserPredictionsModal` (861 líneas) ahora es `dynamic()` con `ssr:false` (se descarga solo al abrir), y los 3 archivos (ranking, mis-pronosticos, modal) dejaron de importar estáticamente `officialEvaluatedMatches/Predictions.json` (128 KB embebidos y parseados 2× en hidratación): la fuente única es la carga dinámica con cache de `dataLoader`.
  - **Drift detectado y corregido**: `public/data` servido por CDN estaba 4 días atrás (165 vs 215 evaluados). Sincronizado + **check md5 src↔public en `validate-fixtures.js` (sección 10)** para que no vuelva a pasar.
  - **fix(tabla)**: fallback ESPN con `?dates=<año>&limit=500` (el host `site.web.api.espn.com` ya no acepta rangos `YYYYMMDD-YYYYMMDD`; el límite por defecto de 100 truncaba la fase liga de Champions: 189 partidos) y tope de locales 30→500 (Champions: 126 por jugar).
  - **feat(tabla)**: partidos agrupados por jornada con headers sticky (`groupMatchesByDay` en espnApi.ts, smoke test 9/9 en `scripts/test-group-matches.js`).
  - Pendiente de futuro: SW precachea 2 MB de JSON en primera visita (mover `officialPlayers.json` a cache-on-demand), code-splitting por ruta de los 4 chunks compartidos (~730 KB raw).

- **2026-08-31** — **Incidente: resultados no sincronizados — ESPN cambió su API de scoreboard (resuelto con fix + fail-fast)**:
  - **Síntoma:** la página no mostraba los resultados de la jornada del 29-30/08; los runs del cron figuraban `success` pero no commiteaban nada nuevo desde el 30/08 19:01 UTC.
  - **Causa raíz:** ESPN dejó de aceptar listas de fechas separadas por coma (`?dates=20260831,20260830,...` → HTTP 400 `Failed to get events endpoint`); solo acepta fecha única o **rango con guión** (`?dates=20260828-20260831`). El cron (`datesParam()` con `join(",")`) y el fetcher cliente (sin `dates` → solo día actual) quedaron rotos en silencio: `if (!res.ok) continue;` saltaba todas las ligas.
  - **Solución (`071c3db`):** (1) `datesParam()` en `scripts/auto-sync-espn-results.js` genera rango `YYYYMMDD-YYYYMMDD` con backfill de 3 días; (2) `src/lib/espnResultsFetcher.ts` pide los últimos 3 días para que el navegador muestre resultados de ayer; (3) **fail-fast nuevo**: si TODAS las ligas devuelven error (HTTP != ok o excepción), el script lanza error → el run de GitHub Actions queda marcado como FALLIDO (antes fallaba en silencio) y loguea el status + URL por liga; (4) backfill manual ejecutado: 37 partidos con goleadores reales en `officialEvaluatedMatches.json`, 34 resultados persistidos en Supabase vía MCP (service role implícito) y puntos actualizados (Zahilet 9, Raudel 8, Milanarg 5, JR_DT 4).
  - **Verificación:** `verify-logic.js` 43/43, `validate-fixtures.js` 0 errores, `tsc --noEmit` OK, ranking en vivo mostrando los resultados nuevos desde Supabase antes del deploy.
  - **Para el futuro (cualquier agente):** si el cron "tiene éxito" pero no commitea resultados, verificar el formato de `?dates=` contra ESPN (probar `curl ".../scoreboard?dates=YYYYMMDD-YYYYMMDD"`). Nunca usar listas separadas por coma.
- **2026-08-29** — **Incidente: nadie podía logearse — Auth de Supabase caído (resuelto con restart)**:
  - **Síntoma:** todos los endpoints de auth (`/auth/v1/token`, `/health`, `/settings`) se colgaban (timeout 20-25s) mientras REST (base de datos) respondía 200. El proyecto figuraba `ACTIVE_HEALTHY` en la Management API.
  - **Causa raíz:** incidente del lado de Supabase (status.supabase.com): *"401 errors due to JWT rejections"* (14-28/08, rollout gradual) + *"Increased response times for requests"* (27-29/08). El servicio GoTrue (auth) de este proyecto quedó colgado; Supabase recomendó reiniciar el proyecto.
  - **Solución:** `POST https://api.supabase.com/v1/projects/ilkndkqcmxvlufxaugog/restart` con el token de Management API (`sbp_...`) → HTTP 200. *(2026-10-17: el archivo `~/.config/opencode/opencode.jsonc` NO existe y el token disponible en la máquina devuelve 401 → generar uno nuevo en el dashboard → Account → Access Tokens, o reiniciar desde Project Settings → General.)* Tras ~1 min de arranque: `/auth/v1/health` → 200 (GoTrue v2.195.0), login real → 200 en 1.7s, app web verificada end-to-end (login bybit6118 → landing con sesión).
  - **Para el futuro (cualquier agente):** si los endpoints auth cuelgan pero REST responde → reiniciar el proyecto con el comando anterior (o dashboard → Settings → General → Restart project). NO tocar código.
- **2026-08-29** — **Verificación integral de toda la lógica (100% funcional)**:
  - **Code review completo (skill `anthropic-code-review`, 5 agentes paralelos)**: 12 issues corregidos — (1) CRÍTICO: `/pronosticar` trataba TODA la UCL como KO (fase liga bloqueada para eliminados, etiquetas falsas) → ahora usa `isKnockoutMatch` con fecha en la UI y el save gate; (2) sync-db `on_conflict=name` → `name,league` (constraint real); (3) sync-db ya no pisa resultados persistidos (upsert sin columnas de resultado); (4) remap de predicciones con clave `league|home|away` (Torino-Monza existe en Coppa Y Serie A); (5) aliases `paphos*` → Pafos FC; (6) `getKnockoutRound` formato 2026/27 (feb=Dieciseisavos/playoff, mar=Octavos, abr=Cuartos, abr-may=Semifinal, may=Final); (7) matchday UCL real por agrupación de fechas (8×18, no 2-fechas-por-jornada); (8-11) comentarios y docs; (12) plantillas completadas con rosters ESPN reales (`sync-player-squads.js`): 30/32 equipos (Shakhtar/SABAH sin fuente en ESPN/football-data — 403, NO se inventó nada). **Nota:** un bug de sync-db (select sin `league`) eliminó las 4 predicciones de la DB durante una corrida → restauradas desde `officialEvaluatedPredictions.json` (con scorers) y el script corregido.
  - **Verificación de puntos de todos los usuarios**: Milanarg 5 pts confirmados por el motor real (`calculateScore`: +3 resultado, +1 diferencia, +1 goleador Ramos); bybit6118 3 predicciones de Man Utd (partidos futuros → pendientes); resto 0 pts. Cron ejecutado local contra producción: evaluó y persistió correctamente (idempotente).
  - **RLS verificada empíricamente**: lectura pública OK (matches/profiles/predictions), escritura anónima 401, PATCH cruzado IDOR con 0 filas afectadas, scorers sin owner 401. *(2026-10-17: la lectura pública de `predictions`/`prediction_scorers` quedó restringida a partidos ya iniciados; ver más abajo.)*
  - **App web probada end-to-end (playwright)**: login bybit6118 → ventana de pronósticos con partidos REALES (Aston Villa–Arsenal 31/8, Arsenal–Chelsea 6/9, Napoli–Arsenal UCL 9/9) → predicción 1-2 + goleador Saka guardada en Supabase → mis-pronósticos la muestra → ranking: Milanarg 1° con 5 pts y 12 participantes. Únicos errores de consola: 3 CORS esperados de football-data (fallback ESPN OK).
  - **`scripts/verify-logic.js` (nuevo)**: 43 checks de lógica de negocio (scoring completo, normalización de 20 equipos nuevos, KO por fecha, survivor, IDs deterministas, fonético).
  - **Rebotes de email (advertencia de Supabase)**: eliminada la cuenta de testing `test.debug.1787877902582@gmail.com` (13→12 usuarios) y la de Perico (12→11). Quedan 11 usuarios (8 confirmados, 3 sin confirmar: Sergio, Leyver Estrada, g3610811). Recomendación: no probar registro con emails inventados (confirm email activo).
- **2026-08-29** — **Regeneración completa del calendario 2026/27 con datos 100% reales (0 fabricados)**: La auditoría reveló que `officialFixtures.json` estaba basado en equipos/cruces de la temporada 2025/26 (LaLiga 448 con Almería/Elche, Serie A con Como jugando 2 partidos el mismo día ×71, Bundesliga 374 con Darmstadt/Düsseldorf, PL con Leicester/Southampton/West Ham/Wolves, UCL 2026/27 inventada con 0 coincidencias vs ESPN, UEL 18 y UECL 10 fabricadas). Se reescribió `scripts/sync-official-fixtures.js` para regenerar SOLO desde fuentes reales: 4 ligas (football-data API: 380/380/380/306), UCL fase liga 144 (ESPN), Copa Italia 28 (ESPN). `scripts/validate-fixtures.js` cruza cada partido contra su fuente (1446/1446 liga + 144/144 UCL + 28/28 Coppa idénticos). UEL/UECL (36 equipos reales de Wikipedia, sorteo 28/8 sin publicar) y rondas KO se agregan cuando las fuentes las publiquen. `teamAliases.json`: ~200 canónicos, alias de fuentes, `teamCups` derivado (179 equipos), `knockoutPairs` vacío + detección KO europea por fecha (feb-ago) en `isKnockoutMatch`. DB re-sembrada: `matches` 1618 exactos, `teams` 179 reales, 4 predicciones remapeadas a ids reales (2 de partidos inexistentes eliminadas), 5 resultados reales persistidos, `officialPlayers.json` Paphos FC→Pafos FC (4.749 jugadores). Commiteado y desplegado (`da4e525`, deploy success).
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
  - **Capa Servidor/Cron (`.github/workflows/auto-evaluate-matches.yml` + `scripts/auto-sync-espn-results.js`)**: Ejecución programada cada 30 minutos en GitHub Actions para extraer resultados de las 8 competiciones, actualizar `officialEvaluatedMatches.json`, calcular puntos de todos los usuarios y commitear automáticamente.

## Estado Actual

- **Branch:** `main` (desplegado a GitHub Pages).
- **Build Status:** `npm run build` y `npx tsc --noEmit` pasando con 0 errores (24 rutas estáticas generadas).
- **Deploy:** GitHub Actions activado con éxito en `main` (`deploy.yml`). Los crons **disparan el deploy al final** (`gh workflow run deploy.yml --ref main`, `permissions: actions: write`) porque los pushes del bot con `GITHUB_TOKEN` no generan eventos de workflow.
- **Automatización & Superviviente:**
  - Cron de resultados y puntos cada 30 min (`auto-evaluate-matches.yml`) con fail-closed en persistencia Supabase.
  - Cron mensual de plantillas el 1ro de cada mes (`auto-sync-squads.yml`) para actualizar traspasos.
  - 100% desatendida en 7 copas knockout (Champions, Europa, Conference, Copa Italia, FA Cup, Copa del Rey, DFB-Pokal).
- **Calendario:** 1.926 partidos reales (0 fabricados) — 4 ligas football-data API + copas europeas/domésticas ESPN.
- **Plantillas:** 7.196 jugadores oficiales clasificados por posición cubriendo 240 clubes (sync mensual).
- **Base de datos (Supabase `ilkndkqcmxvlufxaugog`, consultado 2026-10-17):** `matches` 1.926 (326 con resultado), `teams` 225, `players` 517, `profiles` 18 usuarios, `predictions` 67, `prediction_scorers` 195, `tournament_survivors` 17.
- **Verificación:** `verify-logic.js` (59/59 checks OK), `verify-engine-parity.js` (paridad JS ↔ TS: 20 checks / 76 casos / 206 pts reales, candado en CI), `validate-fixtures.js` (0 errores), `test-survivor.js` (12/12 PASS), ESLint (0 errores), `tsc --noEmit` OK, y pruebas de RLS + comportamiento en **producción** (rol authenticated/anon con rollback).
- **Seguridad (2026-10-13):** endurecimiento **aplicado y verificado en producción** (migraciones `security_hardening_and_points_lock`, `fix_points_lock_security_invoker`, `predictions_club_and_knockout_lock`). Reglas blindadas en la base: cierre 1 min (`is_match_open_for_prediction`), `points`/`created_at` solo service role (`trg_points_server_only`), **solo partidos del propio club** (`is_users_club_match`), **eliminado de copa no pronostica** (`is_prediction_cup_allowed`), superviviente que no revive, club bloqueado (`trg_enforce_team_lock`) + `reset_participation()`. Sin RPCs públicos de escritura.
- **Riesgo aceptado (2026-10-17):** *leaked password protection* (HaveIBeenPwned) queda desactivada — **requiere plan Pro** y el proyecto está en **Free** (verificado: el proyecto es "J soluciones", badge FREE, y el menú de Authentication no tiene sección *Passwords*). La config de Auth vive en GoTrue (no en Postgres): solo por dashboard o Management API (`PATCH /v1/projects/<ref>/config/auth`). El único WARN real que queda en el Security Advisor es `auth_leaked_password_protection`; los demás son intencionales. Revisar si se sube a Pro.

## Cambios Recientes

- **2026-10-23** — **Cron `Auto-Sync` en rojo 24 h (`persistToSupabase falló: fetch failed`)**: 7 corridas fallidas seguidas desde el 22/10 19:46.
  - **Causa raíz:** `persistToSupabase` filtraba los partidos pendientes con `matches?...&id=in.(<todos los ids con resultado>)`. Al pasar de ~400 partidos finalizados la URL llegó a **15,7 KB** y undici (el `fetch` de Node) abortó con `Headers Overflow Error` (límite interno de 16 KB) → `TypeError: fetch failed`. No era ESPN ni Supabase: el `--dry-run` local fallaba en el mismo punto.
  - **Fix:** pedir solo las filas pendientes (`matches?select=id&result_home=is.null`, pocas) y comparar en memoria. Commit `eee2a3f`.
  - **Verificación:** local `--dry-run` ✅ y corrida real (37 resultados + 67 puntos persistidos) → `npm run verify` 59/59 + paridad 20 checks/86 casos; en el runner, run manual `40020036771` ✅ (422 finalizados, 240 pts, 67 puntos persistidos) + `Verify` y `Deploy` ✅.
  - **Regla:** nunca meter listas largas de ids en la query string de PostgREST; filtrar por columna (`is.null`) o en memoria.

- **2026-10-20** — **Cron de resultados a cada 30 min + limpieza de resultado huérfano**:
  - **Síntoma:** los 9 partidos de Champions del día estaban `completed` en ESPN pero en la app seguían sin resultado ni puntos. La última corrida `schedule` había sido a las 14:19 (Caracas) y la de las 16:00 nunca se ejecutó (GitHub retrasa `schedule` bajo carga; el cron declaraba `0 */2 * * *`).
  - **Fix:** disparo manual del workflow (run `39509047211` → 9/9 resultados, 375 evaluados, deploy `39509089119` ✅) y cambio de schedule a `*/30 * * * *`. Repo público → minutos ilimitados; commit y dispatch del deploy siguen condicionados a que haya cambios.
  - **Dato huérfano:** el fixture Levante-Athletic del 21/10 conservaba un 0-0 del partido reprogramado de septiembre (se mostraba finalizado y bloqueaba pronósticos). Limpiado a `NULL`; verificado `0` partidos futuros con resultado.
  - **Auditoría del motor:** 63/63 pronósticos evaluados recalculados coinciden con los puntos guardados; DB vs JSON sin diferencias de puntos ni resultados; únicos NULL son pronósticos creados después del pitazo (anti-farmeo).

- **2026-10-17** — **Endurecimiento de Supabase: anti-copia de pronósticos + limpieza de rendimiento (todo en `main` y en prod)**:
  - **🔴 Fuga cerrada (anti-copia):** la policy pública de lectura de `predictions`/`prediction_scorers` permitía ver pronósticos de partidos **abiertos** por REST con la anon key → se podía copiar. Ahora la policy solo deja leer partidos ya iniciados y el modal del ranking usa la RPC `get_public_predictions(p_user_id)` (`SECURITY DEFINER`, parametrizada) que devuelve los abiertos **enmascarados** (`points`/marcador `NULL`, `is_hidden = TRUE`). Migración `2026-10-17_rls_anti_copia_predictions.sql`, registrada en `supabase_migrations.schema_migrations` como `20261017214000`; commit `dee3fd7`. Semántica en cliente: `is_hidden = ... IS TRUE`. Efecto aceptado: el ranking solo cuenta pronósticos de partidos iniciados; la puntuación no cambia.
  - **Limpieza de rendimiento:** `DROP INDEX idx_players_name` (idx_scan=0) + `DROP POLICY "Users can view own profile"` (redundante con la pública `USING true`). Migración `2026-10-17_perf_cleanup_indexes_policies.sql` (`20261017220000`), commits `929d8fa` + `715ed10`. **`idx_profiles_team_id` SE MANTIENE**: aunque tiene idx_scan=0, cubre la FK `profiles_team_id_fkey` — borrarlo solo cambiaba el aviso de `unused_index` a `unindexed_foreign_keys` (ambos INFO) y encarecía DELETE/UPDATE sobre `teams`. `schema.sql` sincronizado.
  - **Prueba viva (anon key):** `predictions` 58 filas (antes 66), 0 futuras; `prediction_scorers` 174 (antes 192); RPC con usuario `836a17f7-…` → 10 filas (2 enmascaradas / 8 visibles).
  - **CI:** `Verify` + `Deploy` ✅ en `dee3fd7` (39072119672/39072119692) y en `715ed10` (39074008242/39074008267).
  - **Riesgo aceptado:** *leaked password protection* queda OFF (requiere Pro; ver arriba). Es el único WARN real del advisor.
- **2026-10-17** — **Merge a `main` de `fix/logica-puntuacion-definitiva` + verificación en producción (lógica de puntuación cerrada)**:
  - **Rebase necesario:** la rama se rebasó sobre `80f5c3c` (`chore(cron): auto-sync finished match results from ESPN`) porque el cron había commiteado en `main` durante la sesión → había que re-verificar con los datos nuevos antes de mergear. Re-verificado: `npm run verify` **59/59 + paridad 76 casos / 206 pts** (los 65 registros del JSON: 57 con `points` no nulo = 206 pts; los 8 restantes están pendientes de resultado — el script de paridad filtra por partido evaluado, no los salta por error), `tsc` 0 errores, ESLint 0 errores, `npm run build` OK.
  - **Merge:** fast-forward `80f5c3c..2bfb362` (2 commits: `b7a9b06` fix + `2bfb362` docs), push a `origin/main`, rama local eliminada.
  - **CI en `main`:** `Verify scoring logic` ✅ (el candado ya corre en cada push a `main`, no solo en PRs) y `Deploy to GitHub Pages` ✅.
  - **Producción verificada:** `futbolcamisetapasion.com` home **200** y los **4 JSON con md5 idéntico** a `src/data/` → cero drift; 0 referencias a la Regla 5 en el HTML servido.
  - **Servidor de vista previa apagado** (puerto 3007 libre) tras la aprobación del usuario.
- **2026-10-17** — **Lógica de puntuación fijada de una vez por todas (rama `fix/logica-puntuacion-definitiva`)**:
  - **Causa raíz del "cambiaron los puntos":** la regla vive en **dos motores** (`scripts/lib/score-utils.js` JS para el cron, `src/lib/scoring.ts` TS para el frontend) y `verify-logic.js` **solo probaba el JS** → una divergencia frontend↔cron pasaba desapercibida. Además `assign-points.js` aceptaba los puntos **por parámetro** (vector de puntos arbitrarios).
  - **Fix:** `docs/SCORING_LOGIC.md` (**fuente única de verdad**, 4 reglas, máx teórico **15 pts**, cap 5 goleadores/equipo, candados DB, anti-farmeo) + `scripts/verify-engine-parity.js` (compara ambos motores campo por campo sobre los 57 pronósticos reales = 206 pts y exige reproducir el `points` guardado; falla con exit 1 si divergen) + `.github/workflows/verify.yml` (verify-logic + paridad + `tsc` + ESLint en cada PR) + `npm run verify` **antes del build** en `deploy.yml` (una regla rota bloquea el deploy) + `assign-points.js` neutralizado (LEGACY, ignora `pointsAwarded`, calcula con `calculateScore`).
  - **Verificado:** `verify-logic.js` **59/59** · paridad **20/20 (76 casos, 206 pts reales)** · `tsc --noEmit` 0 errores · ESLint 0 errores · `npm run build` OK.
  - **Falso positivo descartado:** el "Barcelona-Getafe sin puntos" (kickoff 10/10, `points = NULL`) es la **regla anti-farmeo** funcionando: esa predicción se creó el 12/10, **2 días después del pitazo** → se descarta por diseño. La otra predicción del mismo partido (creada el 06/10) cobró sus 3 pts correctamente.
- **2026-10-17** — **Fix: producción no se sincronizaba con los datos del cron (drift de 3 días)**:
  - **Síntoma:** `main` al día, pero `futbolcamisetapasion.com/data/*.json` servía datos del 14/10 (verificado por md5).
  - **Causa raíz:** `deploy.yml` solo escucha `push`; los pushes de `github-actions[bot]` con `GITHUB_TOKEN` **no generan eventos de workflow**. El commit entraba a `main` y el deploy nunca se disparaba.
  - **Fix (PR #1, `24df969`):** en `auto-evaluate-matches.yml` y `auto-sync-squads.yml` → `permissions: actions: write` + step final condicional (`changed == 'true'`) con `gh workflow run deploy.yml --ref main`. `workflow_dispatch` es la excepción que `GITHUB_TOKEN` sí puede disparar → **sin PAT**.
  - **Verificado end-to-end en producción:** cron `39059197930` (206 pts) → commit `72d8aef` → dispatch deploy `39059225585` → **success**; md5 de los 4 JSON OK.
  - **Docs:** README (Automatización + Secrets + Historial), AGENTS.md (sección de diagnóstico), CLAUDE.md, DISASTER_RECOVERY_AND_SCHEMA.md, esta memoria.

- **2026-10-13/14** — **Endurecimiento integral aplicado y verificado en PRODUCCIÓN + reglas nuevas + fixes del cron**:
  - **Hallazgo crítico:** la base de **producción** (`ilkndkqcmxvlufxaugog`) **no tenía aplicada** la migración `2026-09-16_security_hardening.sql` (faltaban funciones/triggers/políticas) y había **políticas legacy duplicadas** de `prediction_scorers`/`profiles` que, al sumarse por OR, habrían anulado el candado de tiempo. Se aplicó y verificó con el MCP de Supabase (migraciones + advisors + pruebas de rol authenticated/anon con `BEGIN/ROLLBACK`).
  - **Regla nueva [CRÍTICO] — `points` manipulable:** con el partido abierto, el dueño podía `PATCH` su `points` por REST y el ranking confiaba en ese valor. **Fix:** trigger `trg_points_server_only` (`points`/`created_at` solo `service_role`) + el ranking **siempre recalcula** con `calculateScore()` (no lee `points`). ⚠️ La función del trigger **NO** debe ser `SECURITY DEFINER` (cambiaría `current_user` y el chequeo de rol quedaría inútil).
  - **Regla nueva — solo partidos del propio club:** `is_users_club_match()` en las políticas de `predictions` (antes se podía pronosticar CUALQUIER partido abierto de `matches` y farmear puntos). Retroactivo: 57/57 ya eran del club.
  - **Regla nueva — eliminado de copa no pronostica:** `is_prediction_cup_allowed()` (+ `match_cup_slug`/`is_ko_cup_match`) bloquea KO de una copa donde el survivor está `ELIMINATED`.
  - **Regla nueva — superviviente que no revive:** DELETE de `tournament_survivors` solo si sigue `ALIVE` con `history = '[]'`.
  - **Cap de goleadores:** el motor acreditaba solo 5 en total (`slice(0,5)`); regla oficial = **5 por equipo (máx 10)**. Alineado motor (`scoring.ts` + `score-utils.js`) + UI + textos. `verify-logic.js` 57 → 59.
  - **Fixes del cron (`auto-sync-espn-results.js`):** penales con el **id real de ESPN** (antes el UUID determinístico → nunca resolvía); progresión de survivors en **orden cronológico**; **sincronización dual** `src/data` ↔ `public/data` de los JSON evaluados (antes el sitio servía JSON evaluados desactualizados: 47 vs 56). `sync-official-fixtures.js` también dual-write; `sync-db.js` clave de remapeo corregida; `espnResultsFetcher.ts` marcador estricto (no fabrica 0-0).
  - **Migraciones en prod:** `security_hardening_and_points_lock`, `fix_points_lock_security_invoker`, `predictions_club_and_knockout_lock` (+ espejo en `supabase/migrations/2026-10-13_*.sql`). Retroactivo: 0 manipulaciones de `points`, 2 filas `Raphinha` duplicadas eliminadas.
  - **Docs:** README / AGENTS / CLAUDE / DISASTER_RECOVERY / ADMIN_PANEL + esta memoria actualizados; nota de *leaked password protection* (requiere plan Pro; proyecto en **Free**).
  - **Verificación (todas):** 59/59 lógica · 12/12 survivor · tsc 0 · ESLint 0 · build 24 rutas · sitio 200 en todas las rutas · pruebas de comportamiento en producción (propio club OK, otro club bloqueado, KO-eliminado bloqueado, borrar survivor eliminado bloqueado, prístino permitido, points bloqueado, cron service role OK, anon sin escritura).
  - **Disparo manual del cron:** PAT de GitHub y token de Management API del entorno estaban vencidos → se disparó por `push` temporal (filtro de path en el workflow, luego revertido). Verificado: commit del bot `a81adc6`.

- **2026-09-16** — **Auditoría de seguridad (`security-review` skill) y cierre de 5 vulnerabilidades**:
  - **Metodología:** revisión con datos reales (REST con anon key + verificación del bundle desplegado) y pruebas de RLS en un Postgres 15 desechable (Docker) emulando el rol `authenticated` con `BEGIN/ROLLBACK`.
  - **VULN-001 (Critical) — puntaje retroactivo:** el cierre “1 minuto antes” existía solo en el cliente; la política de `predictions` validaba únicamente ownership. Cualquiera con una cuenta nueva podía insertar por REST el marcador exacto de partidos ya terminados (la tabla `matches` es de lectura pública, con resultados) y el cron le asignaba 5 pts por partido, para siempre. **Confirmado en producción:** 2 filas con `created_at` posterior al kickoff y con puntos asignados (una creada 10 días después). **Fix:** `is_match_open_for_prediction()` en las políticas de `predictions` y `prediction_scorers`, `isPredictionOnTime()` en el motor del cron (con grandfathering de lo ya archivado), DELETE propio y RPC de reinicio.
  - **VULN-002 (High) — API key de football-data.org filtrada:** estaba en el texto de `README.md` y `DISASTER_RECOVERY_AND_SCHEMA.md` (repo público) **y** dentro del bundle publicado (2 chunks servidos por `futbolcamisetapasion.com`), porque `NEXT_PUBLIC_*` se inlinea. **Fix:** valor reemplazado por placeholder, la key ya no se inyecta en el build (deploy.yml) y quedó documentado que solo aplica a dev local. **Acción manual pendiente: rotarla.**
  - **VULN-003 (High) — inflación de puntos por goleadores duplicados:** el `<select>` permitía repetir jugador y `calculateScore` sumaba +1 por cada repetición (hasta +5 con un solo gol real). **Había 2 casos reales en producción** ("Raphinha" duplicado en dos pronósticos con 7 pts). **Fix:** dedupe en el motor (`src/lib/scoring.ts` + `scripts/lib/score-utils.js`), índice único `(prediction_id, player_name)`, `CHECK (goals BETWEEN 1 AND 10)`, trigger de máx. 5 por equipo y filtro en la UI que ya no ofrece jugadores usados.
  - **VULN-004 (High) — superviviente KO controlado por el cliente:** la política `FOR ALL` permitía al dueño reescribir `status`, `history` y `active_team_id` (revivir a un eliminado o heredar la camiseta del favorito). **Fix:** políticas restringidas a alta inicial (club propio, `ALIVE`, historial vacío) + borrado; el cliente ya no persiste la progresión (la escribe el cron) y `upsertCupSurvivor` dejó de usarse desde `mis-pronosticos`.
  - **VULN-005 (Medium) — cambio de club gratis:** un PATCH a `profiles.team_id` cambiaba de club conservando todos los puntos (la UI dice “Equipo confirmado — no se puede cambiar”). **Fix:** trigger `trg_enforce_team_lock` + RPC `reset_participation()`, que borra pronósticos/goleadores/survivors, libera el club y marca `revoked:<uid>` en `app_meta` para que el cron purgue esos puntos del archivo oficial (antes el reinicio no bajaba los puntos a 0 realmente).
  - **Bonus (bug real encontrado por las pruebas):** `supabase/schema.sql` **no se podía ejecutar en una base nueva** — la sección 5 creaba el trigger `on_auth_user_created` antes de definir `public.handle_new_user()`. Reordenado y verificado: el esquema completo aplica limpio desde cero. También se detectó que producción **no** tiene las columnas `updated_at` declaradas en el schema (se agregan con `IF NOT EXISTS` en la migración).
  - **Evidencia antes/después:** con el esquema anterior los 4 ataques (pronóstico de partido terminado, goleador duplicado, superviviente revivido/transferido, cambio de club) funcionaban; con la migración aplicada, los 20 casos de prueba pasan (bloqueos + controles: partido abierto pronosticable, apodo editable, primera elección de club, medianoche = jornada vespertina, reinicio con marca de revocación).
  - **Archivos:** `supabase/migrations/2026-09-16_security_hardening.sql` (nueva), `supabase/schema.sql`, `src/lib/scoring.ts`, `src/lib/footballData.ts`, `src/app/pronosticar/page.tsx`, `src/app/mis-pronosticos/page.tsx`, `src/app/perfil/page.tsx`, `scripts/lib/score-utils.js`, `scripts/auto-sync-espn-results.js` (+ `--dry-run`), `scripts/verify-logic.js` (48 → 57 checks), `.github/workflows/deploy.yml`, `README.md`, `AGENTS.md`, `.env.example`.

- **2026-09-16** — **Auditoría Exhaustiva de Plantillas y Enriquecimiento de Roster 2026/27 (`enrich_official_squads.py`)**:
  - **Hallazgo**: Equipos como Benfica carecían de figuras clave (Di María, Otamendi, Kökçü, Aktürkoğlu, Arthur Cabral, António Silva, Florentino Luís, Renato Sanches) debido a que la API de ESPN truncaba a 30 jugadores o proyectaba transferencias ficticias.
  - **Solución y Blindaje**: Se creó `scripts/enrich_official_squads.py` auditando los 240 clubes y consolidando **7.249 jugadores oficiales** clasificados por posición (Delanteros, Mediocampistas, Defensores, Arqueros). Verificación al 100% de los planteles de Benfica, Real Madrid, Barcelona, AC Milan, Bayern Munich, Manchester City, Arsenal, Liverpool, Inter Milan, PSG, Juventus, Sporting CP, Porto, Chelsea, Tottenham, Leverkusen, Dortmund, Roma, Napoli y Lazio.

- **2026-09-16** — **Fix Ventana Rodante de Pronósticos en Vivo (`cf2cd77`)**:
  - **Incidente**: Un usuario con club Barcelona reportó que no le salía el próximo partido (*Barcelona vs Racing Santander* del 16 de septiembre) en `/pronosticar`.
  - **Causa Raíz**:
    1. `public/data/officialFixtures.json` en la CDN tenía una versión antigua (1.650 partidos vs 1.672 en `src/data/`) con la fecha de dicho encuentro configurada a medianoche (`2026-09-16T00:00:00Z`).
    2. El filtro de partidos por fecha (`match_date >= nowIso`) evaluaba falso al transcurrir la madrugada, omitiendo los partidos del día actual.
    3. `src/lib/footballData.ts` intentaba llamadas directas a `api.football-data.org` fuera de localhost, fallando por CORS en el dominio de producción `futbolcamisetapasion.com`.
  - **Solución y Blindaje**:
    1. Se sincronizó `public/data/officialFixtures.json` con los 1.672 fixtures oficiales completos y horarios reales (`19:30:00Z`).
    2. Se implementó `isMatchDateValid` en `src/lib/footballData.ts` para que cualquier partido del día actual (`YYYY-MM-DDT00:00:00Z` o con fecha hoy) permanezca visible y pronosticable durante toda la jornada.
    3. Se restringieron las llamadas directas de `football-data.org` exclusivamente a `localhost` y `127.0.0.1`, cargando siempre de forma ultrarrápida desde los JSONs cacheados en CDN en producción.

- **2026-09-14** — **Regla #5 de Goleadores (Recálculo Retroactivo) y Resolución de Sincronismo ESPN**:
  - **Motor de Scoring**: Se actualizó la Regla #5 para otorgar +2 puntos si la cantidad máxima de goles predichos para un goleador coincide exactamente con los goles que marcó el líder goleador del partido real (antes exigía coincidir el número exacto de goleadores del equipo). Re-evaluados todos los partidos (ej. _Zahilet_ +4 pts en RM vs Elche, ascendiendo a 28 pts consolidados).
  - **Incidente ESPN Range Dates API**: GitHub Actions cron y client fallaron (`HTTP 400`) porque ESPN deshabilitó las consultas de rango de fechas (`?dates=YYYYMMDD-YYYYMMDD`).
  - **Solución (`23a44e1`)**: Nuevo script con consultas paralelizables de fechas individuales (`?dates=YYYYMMDD`) y un iterador de Backfill robusto.
  - **Sincronización End-to-End (`248798a`)**: Inyección correcta de `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a los GitHub Secrets del runner del CI, resolviendo fallos fantasma en workflow_dispatch por bypass erróneo del RLS. El cron persitió automáticamente 146 puntos repartidos a la DB de producción.
  - **Redirección cruzada en memoria (`a5f1a45`)**: `/ranking` carga los puntos validados desde Supabase directamente preservando el field original para evitar inicializaciones en `null` que rompían la UI si el ID del fixture divergía del JSON compilado.

- **2026-09-12** — **Auditoría de Performance & Accesibilidad (PageSpeed 100/100) + Optimización de Red**:
  - **Google PageSpeed Insights Perfecto**: 100/100 en Rendimiento, 100/100 en SEO, 100/100 en Prácticas Recomendadas y 100/100 en Accesibilidad (tanto en Móvil como en Desktop).
  - **Core Web Vitals en Móvil**: FCP 0.2s, LCP 0.4s, TBT 0ms (bloqueo nulo), CLS 0 (sin layout shifts), Speed Index 0.3s.
  - **Paralelización de Red (`Promise.all`)**:
    - `/mis-pronosticos`: Reducción de cascada de 8 peticiones secuenciales a carga 100% concurrente (~250ms).
    - `/tabla/[league]`: Carga en paralelo de fixtures, clasificación y goleadores con `Promise.all`.
    - `/pronosticar`: Eliminación de patrón N+1 en carga de goleadores (`.in("prediction_id", predIds)`).
  - **Mejoras de Accesibilidad & WCAG AA**:
    - Landmark semántico `<main id="main-content">` agregado en `src/app/layout.tsx`.
    - Viewport habilitado para escalabilidad de usuarios con zoom sin bloqueos.
    - Contraste elevado a nivel WCAG AA en textos secundarios de tarjetas de reglas y podio (`text-slate-200` y `text-slate-300`).
    - Atributo `aria-label` descriptivo en enlace de WhatsApp en `Footer.tsx`.
  - **Feature de transparencia (`UserPredictionsModal.tsx`)**: Modal interactivo accesible al hacer clic en cualquier participante del ranking o del Podio de Honor. Muestra todos los pronósticos del usuario con el marcador predicho vs real, goleadores y el desglose de puntos regla por regla (+3 resultado, +2 exacto, +1 goleador, +2 cantidad).
  - **Regla Anti-Copia**: Los partidos abiertos (`diffMin > 1`) muestran `🔒 ? - ?` y goleadores protegidos. Los partidos iniciados o finalizados se revelan automáticamente con su puntuación.
  - **Resolución robusta de partidos**: El modal resuelve emparejamientos tanto por ID como por cruce de nombres de equipos (`home_team` vs `away_team`), garantizando que los partidos evaluados con puntos nunca se muestren como ocultos.
  - **Sincronización de jornada 11-12 sept**: 131 partidos finalizados evaluados en `officialEvaluatedMatches.json` y `public/data/` (incluye Real Madrid 4-1 Rayo, Arsenal 2-0 Sunderland, Milan 2-2 Lazio). Puntos asignados a Zahilet (+7 pts en RM, total 22 pts), Raudel (+7 pts en RM, total 21 pts), ARS (+6 pts), Yorman (+4 pts).
  - **Plantillas 2026/27 post-mercado**: `scripts/sync-player-squads.js` reescrito para explorar las 11 competiciones del concurso vía ESPN; sincronizados **7.097 jugadores oficiales** (antes 4.749) de **237 clubes** clasificados por posición (`Arquero`, `Defensor`, `Mediocampista`, `Delantero`) en `src/data/officialPlayers.json` y `public/data/officialPlayers.json`.
  - **Cron mensual de plantillas (`.github/workflows/auto-sync-squads.yml`)**: Automatización programada el día 1 de cada mes a las 04:00 UTC con `workflow_dispatch` manual para mantener plantillas al día.
  - **Hardening de seguridad**: API key de football-data.org eliminada del código fuente y movida a variables de entorno (`NEXT_PUBLIC_FOOTBALL_DATA_KEY` / `FOOTBALL_DATA_KEY`); fallbacks de Supabase anon key / URL hardcodeados eliminados de todos los scripts (`auto-sync-espn-results.js`, `evaluate-matches.js`, `assign-points.js`, `sync-db.js`, `rebuild-eval-preds.js`); secrets de GitHub Actions configurados.
  - **Cron fail-closed**: `auto-sync-espn-results.js` lanza error explícito si fallan `syncFixturesToSupabase`, `persistToSupabase` o `evaluateSurvivors` cuando hay service key configurada, con soporte de ejecución local desacoplada.
  - **ESLint para scripts**: `eslint.config.mjs` configurado con flat-config específico para `scripts/**/*.js` (Node CommonJS), pasando limpio con 0 errores en todo el proyecto.
  - **Calendario 1.672 fixtures**: Re-sincronizado con fuentes reales; `validate-fixtures.js` ajustado para conteo real de Copa Italia (34 partidos) con **0 errores**.
  - **UI / Landing**: Ecualización de altura `h-full flex flex-col justify-between` y alineación simétrica en las 3 tarjetas de reglas y el podio de premios.

- **2026-08-31** — **Fix cron + fetcher ESPN por cambio de API (`071c3db`)**:
  - `scripts/auto-sync-espn-results.js`: `datesParam()` pasa de lista separada por coma a rango `YYYYMMDD-YYYYMMDD` (ESPN devuelve HTTP 400 con comas); agregado `AbortSignal.timeout(15s)` y **fail-fast** que marca el run de Actions como fallido si todas las ligas fallan; loguea el HTTP status y URL por liga.
  - `src/lib/espnResultsFetcher.ts`: el fetch del cliente ahora pide los últimos 3 días (`dates=YYYYMMDD-YYYYMMDD`) para mostrar resultados de ayer en el navegador.
  - Backfill: 37 partidos finalizados con goleadores reales (jornadas 28-30/08) en `officialEvaluatedMatches.json`; 34 resultados + puntos persistidos en Supabase (Zahilet 9, Raudel 8, Milanarg 5, JR_DT 4).
  - Documentación actualizada: `AGENTS.md`, `README.md`, `CLAUDE.md`, `DISASTER_RECOVERY_AND_SCHEMA.md`, `.agents/MEMORY.md`.
- **2026-08-29** — **PWA habilitada — instalable en móvil (`4ecc799`)**:
  - `public/icon.svg` — Icono de la app (4° INTERLIGA en gold sobre navy)
  - `public/manifest.json` — Metadata PWA (nombre, colores, display standalone, scope)
  - `public/sw.js` — Service worker mínimo (caché app shell + offline fallback con network-first)
  - `src/app/RegisterSW.tsx` — Componente client que registra el service worker
  - `src/app/layout.tsx` — Meta tags: manifest, apple-mobile-web-app-capable, theme-color, viewport (sin zoom)
- **2026-08-29** — **Rediseño estético de logos de ligas en landing**:
  - Los logos de las 11 competiciones se reorganizaron en 3 filas con parejas liga→copa:
    - Fila 1: LaLiga, Premier League, Serie A, Bundesliga (ligas nacionales)
    - Fila 2: Copa del Rey, FA Cup, Coppa Italia, DFB-Pokal (copas nacionales, cada una debajo de su liga)
    - Fila 3: Champions League, Europa League, Conference League (europeas, centradas)
  - Archivos modificados: `src/app/page.tsx` (arrays `domesticLeagues`, `domesticCups`, `europeanCups` reordenados)
  - Commits: `30ca200` (reorganización inicial), `5d33df0` (reordenamiento de copas para parejas correctas)
- **2026-08-29** — **Documentación actualizada al estado real 2026/27 (`aa5164c`)**:
  - `AGENTS.md`/`README.md`/`CLAUDE.md`: calendario 1.618 reales, plantillas 4.749, 6 scripts nuevos (sync-official-fixtures, validate-fixtures, sync-db, sync-player-squads, rebuild-eval-preds, verify-logic), detección KO europea por fecha (feb-ago), rondas formato 2026/27, filtro TBD en pronosticar.
  - `DISASTER_RECOVERY_AND_SCHEMA.md`: pasos post-restauración con scripts de sync, diagnóstico (179 equipos / 1.618 partidos).
  - `supabase/schema.sql`: nota sobre semilla histórica de equipos (los reales se sincronizan con sync-db).
  - `scripts/verify-logic.js` (nuevo, 43 checks) commiteado.
  - `officialEvaluatedPredictions.json`: pointsDetails de Milanarg + predicción nueva de bybit6118 (Aston Villa 1-2 Arsenal + Saka, commiteada por el cron remoto — conflicto de rebase resuelto combinando ambas).
- **2026-08-28** — **Fix Sistema KO + 3 Copas Nuevas (FA Cup, Copa del Rey, DFB-Pokal)**:
  - **Expandido a 7 Competiciones KO**: Champions, Europa, Conference, Copa Italia, FA Cup (`facup`), Copa del Rey (`copadelrey`), DFB-Pokal (`dfbpokal`).
  - **Suscripción Automática (`src/data/teamAliases.json`)**: Agregado `teamCups` mapeando los 89 clubes oficiales a sus copas KO correspondientes. Al seleccionar club en `TeamSelectorCard.tsx`, se auto-suscribe a todas sus copas en segundo plano.
  - **Detección Automática de Partidos KO (`isKnockoutMatch`)**: Detección por nombre de liga para copas domésticas y pares pre-enumerados para torneos UEFA.
  - **Resolución de Ganador en Empates/Penales (`resolvePenaltyWinner`)**: Consulta el summary de ESPN para extraer el ganador en definiciones por penales.
  - **Nombre de Ronda Real (`getKnockoutRound`)**: Mapeo temporal preciso según fecha del partido y copa (ej. "Dieciseisavos", "Octavos de Final", "Cuartos de Final", "Semifinal", "Final", "Tercera Ronda", etc.).
  - **UI / UX en `/pronosticar`**: Eliminado el dropdown de selección manual de copas. Si el club del usuario participa, muestra el badge activo; si no participa, muestra aviso informativo claro.
  - **Tests Unitarios (`scripts/test-survivor.js`)**: 12/12 tests pasando con 100% de éxito.

- **2026-08-28** — **Cadena de puntuación 100% automática end-to-end (revisión integral)**:
  - **Fix crítico de IDs aleatorios** en `src/lib/footballData.ts`: `Number(uuid) || Math.random()` hacía que cada carga de página generara un id distinto y ningún pronóstico nuevo pudiera puntuarse. Ahora se preserva el id canónico del fixture y el path de API en vivo re-mapea el fixture por nombres.
  - **IDs unificados en toda la cadena**: cron, fetcher cliente y evaluador usan siempre `matchIdToUuid(fixture.id | evento)`; join por nombres como fallback en ranking/mis-pronosticos/cron.
  - **Módulo compartido `scripts/lib/score-utils.js`** (normalizeTeamName con alias completo, matchIdToUuid, matching fonético, calculateScore, isKnockoutMatch, evaluateSurvivorProgression) + datos extraídos a `src/data/teamAliases.json` (aliasMap, canonicalDbTeams, knockoutPairs).
  - **Fix de FK crítica**: `predictions.match_id` referenciaba `matches(id)` con UUIDs aleatorios → ningún pronóstico podía guardarse en Supabase. Se re-sembró `matches` con los 1.842 ids canónicos de `officialFixtures.json`.
  - **Fix de 34 IDs duplicados** en `officialFixtures.json` (placeholders compartidos por hasta 7 partidos): 169 ids regenerados determinísticamente (0 duplicados).
  - **RPCs `SECURITY DEFINER` en producción** (5): `update_match_results`, `update_prediction_points`, `upsert_fixture_matches`, `update_survivors` (+ `schema.sql`).
  - **Tabla `tournament_survivors` creada en producción** (faltaba migrar el DDL de schema.sql).
  - **Survivor automatizado server-side**: el cron evalúa la progresión KO (solo emparejamientos oficiales, idempotente por match_id en history) y persiste vía RPC; refuerzo client-side en `/mis-pronosticos`.
  - **Backfill de 3 días** en el cron (ESPN `?dates=YYYYMMDD-YYYYMMDD`, rango con guión; antes se usaba lista separada por coma hasta que ESPN la rechazó con HTTP 400 — ver incidente 2026-08-31): no se pierden resultados si el job falla un día.
  - **Persistencia verificada end-to-end**: predicción de Milanarg (AC Milan 3-0 vs Venezia) = 5 PTS en JSON + Supabase (predictions, prediction_scorers, points vía RPC).
  - **Menores**: guard de nulos en merge Supabase, `AbortSignal.timeout` en fetcher ESPN, `goals ?? 0` en scoring, `npm ci` eliminado del workflow cron, loader JSON arreglado en `scripts/test-survivor.js` (7/7 tests OK).

- **2026-08-28** — **Auditoría en teléfono vía ADB/CDP + revisión a fondo de toda la lógica**:
  - Verificación en vivo (Samsung A12): landing, ranking (Milanarg 5 pts correctos), tabla LaLiga, login/registro/perfil, mis-pronosticos, pronosticar — todo OK.
  - **Fix "Invalid Date"** (`1920fd8`): fechas vacías muestran "Fecha por confirmar" en mis-pronosticos (aplica a todos los usuarios).
  - **Fix doble conteo de goleadores** (`15bca32`): ranking/mis-pronosticos deduplican scorers por (jugador, goles, equipo) cuando el pronóstico existe en JSON y Supabase a la vez.
  - **Fix CORS football-data en GitHub Pages** (`e065e2e`): `getOfficialTeamMatches` saltea la API en vivo fuera de localhost (la API solo permite localhost); se usa el bundle oficial. 0 errores en consola del teléfono.
  - **Fix recuperación de contraseña** (`22aed96`): creada la página `/actualizar-contrasena` (el redirect del email apuntaba a una ruta inexistente → 404).
  - **Fix reset de participación**: `handleResetData` en `/perfil` ahora borra también `tournament_survivors`.
  - ⚠️ ~~Acción manual pendiente~~ **RESUELTO**: URL agregada a Supabase vía Management API — `site_url` corregido a `https://futbolcamisetapasion.com` (antes apuntaba a localhost:3000, rompiendo los links de confirmación de registro en producción) y `uri_allow_list` con localhost + sitio + `/actualizar-contrasena`.

- **2026-08-29** — **Code review de seguridad (skill `security-review`) + documentación completa**:
  - **IDOR fix en `prediction_scorers`**: la política era `FOR ALL USING (true) WITH CHECK (true)` — cualquier usuario autenticado podía modificar goleadores de cualquier pronóstico. Ahora la escritura valida ownership (`EXISTS` sobre predictions) y la lectura sigue siendo pública (ranking/cron). Verificado: INSERT anon → 401. *(2026-10-17: la lectura pública se restringió a partidos ya iniciados — la lectura abierta del ranking pasa por la RPC `get_public_predictions(p_user_id)` enmascarada.)*
  - **WITH CHECK agregado** a los UPDATE de `predictions` y `profiles` (evita reasignar `user_id`).
  - Sin hallazgos de XSS/inyección: no hay `innerHTML`/`dangerouslySetInnerHTML`/`eval`; las URLs de logos son server-controlled; el bundle no contiene secretos (solo la anon key pública por diseño).
  - Documentación actualizada: `README.md`, `AGENTS.md`, `CLAUDE.md`, `DISASTER_RECOVERY_AND_SCHEMA.md`, `.agents/MEMORY.md`.

- **2026-08-29** — **Optimización + endurecimiento de Supabase con las skills oficiales** (`npx skills add supabase/agent-skills` + `supabase-postgres-best-practices`):
  - **🔴 Vulnerabilidad cerrada**: los RPCs del cron (`update_match_results`, `update_prediction_points`, `update_survivors`, `upsert_fixture_matches`, `get_meta`, `set_meta`) eran `SECURITY DEFINER` ejecutables por cualquiera con la anon key pública → ataque simulado confirmado (HTTP 204 modificaba puntos). Se ELIMINARON; el cron ahora escribe con la **service role key** (secreto GitHub `SUPABASE_SERVICE_ROLE_KEY`) vía REST directo (bypass RLS). Puntos manipulados en la prueba restaurados (999 → 5).
  - `search_path` fijo en `handle_new_user` y `delete_user_account` (WARN de advisors); `delete_user_account` solo para `authenticated`; `app_meta` sin grants para anon/authenticated (solo service role).
  - **Advisors finales**: solo WARNs intencionales (rls_auto_enable interno de Supabase, delete_user_account para auth, INFO app_meta sin políticas) + leaked password protection (WARN aceptado 2026-10-17: requiere plan Pro; el proyecto está en Free y el dashboard no muestra la sección *Passwords* — solo se activa desde el dashboard/Management API, no por SQL ni MCP).
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

