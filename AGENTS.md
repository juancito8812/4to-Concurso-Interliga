# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

> Para estructura del proyecto, rutas, base de datos, stack, variables de entorno, seguridad, deploy y PWA → ver [README.md](./README.md).

## Convenciones y Buenas Prácticas

- Usar clases de **Tailwind CSS**, no CSS inline (excepto colores dinámicos de liga).
- Los componentes interactivos usan `"use client"`.
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper.
- El cierre de pronósticos es a **1 minuto antes del inicio** (`diffMin <= 1`).
- Se permite **re-editar** pronósticos guardados mientras el partido esté abierto (`diffMin > 1`).
- Siempre usar `normalizeMatchLeague` y `normalizeTeamName` para asegurar correspondencia con plantillas y torneos.
- **Transparencia y Regla Anti-Copia (`UserPredictionsModal.tsx`)**: Al hacer clic en cualquier participante del ranking/podio, se despliega el modal con sus pronósticos. Los partidos abiertos (`diffMin > 1`) muestran `🔒 ? - ?` y ocultan goleadores hasta 1 minuto antes del inicio (`diffMin <= 1`).
- **Carga Concurrente de Red**: Todas las consultas cliente (`loadData`, Supabase, ESPN) deben dispararse en paralelo con `Promise.all` para evitar cascadas secuenciales que afecten el First Contentful Paint y Total Blocking Time.
- El selector de goleadores muestra la plantilla oficial completa (7.196 jugadores) y despliega el contador `[-] 1 [+]` únicamente al elegir un jugador (máx. 5 goleadores por equipo).
- `<Link>` genera rutas relativas automáticamente; `<img>` usa rutas absolutas desde la raíz (`/logos/...`).

### Datos dinámicos (fetch desde public/data/)

- **NINGÚN** JSON de datos se importa estáticamente en JS (`officialPlayers`, `officialFixtures`, `officialEvaluatedMatches`, `officialEvaluatedPredictions`): todo se carga vía `loadData()` de `src/lib/dataLoader.ts` con cache en memoria (una sola petición HTTP por sesión). Importarlos estáticamente embebe cientos de KB en los bundles y duplica los datos en memoria (los rankings ya fetcheaban lo mismo).
- Los 4 JSONs de datos están en `public/data/` como assets estáticos servidos por CDN.
- **Sincronización Dual Obligatoria**: Al modificar cualquier JSON en `src/data/`, **SIEMPRE** copiarlo a `public/data/` (el validador lo verifica por md5, sección 10).
- **Validación de Fechas en Ventana Rodante**: Usar `isMatchDateValid` para que partidos con horarios no configurados o medianoche (`00:00:00Z`) permanezcan activos durante toda su fecha.
- Para agregar un nuevo archivo de datos: copiarlo a `public/data/`, importarlo con `loadData("/data/archivo.json")` en el componente que lo necesite.

### Reglas del concurso — doble capa (cliente + BASE)

Desde la migración `supabase/migrations/2026-09-16_security_hardening.sql`, **toda regla
de negocio debe existir también en la base**: el cliente se evade con la anon key pública
(que es pública por diseño) + una sesión propia (el registro es abierto).

- **Cierre de pronósticos**: `diffMin <= 1` en el cliente **y** `public.is_match_open_for_prediction(match_id)` en las políticas RLS de `predictions`/`prediction_scorers`. Fuera de ventana: INSERT bloqueado, UPDATE 0 filas.
- **Sin puntaje retroactivo**: el cron descarta todo pronóstico con `created_at` posterior al cierre efectivo (`isPredictionOnTime` de `scripts/lib/score-utils.js`). Los registros ya archivados con puntos quedan grandfathereados (son el registro histórico y respaldo de recuperación).
- **La columna `points` solo la escribe el servidor**: trigger `trg_points_server_only` (`enforce_points_service_only`) bloquea cualquier INSERT/UPDATE de `points`/`created_at` por anon/authenticated (solo `service_role`). Antes, un usuario podía PATCHear su `points` mientras el partido estaba abierto y el ranking confiaba en ese valor. El ranking además **siempre recalcula** con `calculateScore()` (no lee `points`).
- **Goleadores**: un jugador una sola vez por pronóstico (`prediction_scorers_unique_player`), máximo 5 por equipo (`trg_enforce_max_scorers`), `goals` entre 1 y 10, y el motor de scoring acredita cada goleador real una sola vez.
- **Superviviente KO**: el cliente solo crea su fila inicial (club propio, `ALIVE`, historial vacío) o la borra. La progresión, las transferencias y la eliminación las persiste **solo el cron** con service role key — el cliente usa `setInitialCupSurvivor` (alta inicial) y nunca persiste progresión.
- **Club bloqueado**: cambiar `profiles.team_id` fuera de `public.reset_participation()` lanza excepción (`trg_enforce_team_lock`). El "Reiniciar participación" del perfil llama a ese RPC (borra todo y deja los puntos en 0).
- **Solo partidos del propio club**: `is_users_club_match()` en las políticas de `predictions` solo permite pronosticar partidos donde juega el `profiles.team_id` del usuario. El cliente ya limitaba la ventana a los 3 partidos de tu club; antes era evadible por REST y se podía farmear puntos prediciendo cualquier partido abierto.
- **Eliminado de copa no pronostica**: `is_prediction_cup_allowed()` bloquea pronósticos en partidos de fase KO de una copa donde `tournament_survivors.status = 'ELIMINATED'` (`match_cup_slug` + `is_ko_cup_match` replican la detección de KO del cliente).
- **Superviviente KO no revive**: la política de DELETE de `tournament_survivors` solo permite borrar la fila si sigue `ALIVE` y con `history = '[]'`. Antes se podía borrar la fila eliminada y reinsertarla "viva" para revivir en la copa.
- **Horarios a medianoche (`00:00:00Z`)**: se evalúan como jornada vespertina (20:00 UTC) en el cliente, en la base (`effective_kickoff`) y en el cron. Si cambiás uno, cambiá los tres.
- **Cron `--dry-run`**: `node scripts/auto-sync-espn-results.js --dry-run` hace todas las lecturas y reporta lo que haría sin escribir nada (ni en Supabase ni en los JSON).
- **Ingesta de resultados del cron (bugs cerrados 2026-09-20)**: el emparejamiento evento ESPN → fixture exige **proximidad de fecha (±3 días)** en `findFixture` (sin esto, una reprogramación atribuía el resultado al fixture de otra fecha: bug Levante-Athletic 0-0 del 16/09 atribuido al partido reprogramado al 21/10) y el score debe venir **explícito** en la respuesta ESPN (`parseInt(score ?? "")` — nunca `score || "0"`, que fabrica 0-0 de eventos sin marcador). Al cambiar el emparejamiento o la ventana, verificar contra `validate-fixtures.js` y auditar huérfanos/fechas contradictorias entre evaluados y fixtures.

### Footer global

- El `Footer.tsx` se renderiza en el layout raíz (`layout.tsx`) y aparece en **todas las páginas** automáticamente.
- Contiene: logo INTERLIGA, columna de Ligas (11 competiciones), Navegación, Sistema de Puntos, ícono de WhatsApp (grupo), copyright con año automático (`new Date().getFullYear()`).
- **NO** duplicar el Footer en páginas individuales.

### Logos de competiciones

- Europa League y Copa del Rey: PNGs extraídos de SVGs raster embebidos (`/logos/europa.png`, `/logos/copadelrey.png`).
- Copa Italia: SVG vectorial puro (`/logos/coppaitalia.svg`) — NO convertir a PNG.
- Las demás competiciones usan PNG o SVG según corresponda.

### Política de Emojis (Jul 2025)

- **NO** se usan emojis informativos (🏆👑🎯✅⚠️📊🔍 etc.) en la UI.
- **SÍ** se permiten: emojis de acción (✕ ← →), emojis de premios (🎽 🩳 🧢 🚩 🍺 🕶️ 🖼️), e iconos decorativos en empty states dimmados (`text-silver/30`).
- La sección de premios en la landing presenta un Podio de Campeones con medallas de texto (1° Oro, 2° Plata, 3° Bronce) y chips visuales independientes para cada artículo del kit.

### Mecánica de Superviviente en Copas KO

- En Champions, Europa League, Conference League, Copa Italia, FA Cup, Copa del Rey y DFB-Pokal, el participante compite de forma independiente (`tournament_survivors`).
- Si predice y acierta la victoria del equipo rival, hereda su camiseta (`active_team_id`) manteniendo intacto su club base en ligas (`profiles.team_id`).

### Detección de Partidos KO (`isKnockoutMatch`)

- Copas domésticas siempre KO.
- Competiciones europeas (Champions/Europa/Conference): fase liga de sep a ene y rondas KO de feb a ago (por fecha, funciona con cruces TBD).

### Rondas Formato 2026/27 (`getKnockoutRound`)

| Mes | Ronda |
|-----|-------|
| Feb | Dieciseisavos de Final (playoff R32) |
| Mar | Octavos de Final |
| Abr | Cuartos de Final |
| Abr–May | Semifinal |
| May | Final |

- La ventana de pronósticos (`/pronosticar`) filtra partidos con equipos `TBD` (placeholders hasta que las fuentes publiquen los cruces reales).

---

## Operaciones y Troubleshooting

### Auth caído (nadie puede loguearse)

**Síntoma:** Endpoints `/auth/v1/*` se cuelgan (timeout) pero REST (`/rest/v1/*`) responde 200 y el proyecto figura `ACTIVE_HEALTHY`.

**Causa:** El servicio GoTrue quedó colgado (incidente conocido: *"401 errors due to JWT rejections"*, ago-2026).

**Solución:** Reiniciar el proyecto (NO tocar código):
```bash
curl -X POST "https://api.supabase.com/v1/projects/ilkndkqcmxvlufxaugog/restart" \
  -H "Authorization: Bearer <MANAGEMENT_API_TOKEN>"
```
El token `sbp_...` está en `~/.config/opencode/opencode.jsonc`. Verificar con `GET /auth/v1/health` (debe devolver 200 con `"version":"v2.x"`).

### Rebotes de email de Supabase

Las cuentas sin confirmar (`confirmed_at IS NULL` en `auth.users`) generan rebotes. Diagnosticar:
```sql
SELECT email, created_at FROM auth.users WHERE confirmed_at IS NULL;
```
Eliminar cuentas de testing/obsoletas con DELETE de `profiles` + `auth.users` (verificar dependencias primero). **NO** probar registros con emails inventados.

### Resultados no sincronizados (incidente ago-2026)

ESPN cambió su API y **rechaza listas de fechas separadas por coma** (`?dates=20260831,20260830,...` → HTTP 400). Solo acepta fecha única o **rango con guión** (`?dates=YYYYMMDD-YYYYMMDD`). El cron tiene **fail-fast**: si todas las ligas fallan, el run queda marcado como fallido.

Diagnosticar:
```bash
gh run list --workflow=auto-evaluate-matches.yml
# Revisar log de "Sync finished match results from ESPN"
curl "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260828-20260831"
```

### Producción desactualizada tras el cron (incidente oct-2026)

**Síntoma:** los JSON de `main` están al día pero `futbolcamisetapasion.com/data/*.json` sirve datos viejos (drift de días).

**Causa raíz:** `deploy.yml` solo escucha `push`, y los pushes hechos por `github-actions[bot]` con el `GITHUB_TOKEN` **no generan eventos de workflow** (limitación de GitHub). El cron commiteaba pero nunca se desplegaba.

**Fix:** los workflows del cron cierran con un step condicional `gh workflow run deploy.yml --ref main` bajo `permissions: actions: write` (`workflow_dispatch` es la única excepción que `GITHUB_TOKEN` puede disparar → no hace falta PAT).

Diagnosticar drift:
```bash
# Comparar el JSON local contra el de producción
for f in officialEvaluatedMatches.json officialEvaluatedPredictions.json officialFixtures.json officialPlayers.json; do
  loc=$(md5sum src/data/$f | cut -d' ' -f1)
  rem=$(curl -s "https://futbolcamisetapasion.com/data/$f?cb=$(date +%s)" | md5sum | cut -d' ' -f1)
  [ "$loc" = "$rem" ] && echo "OK    $f" || echo "STALE $f"
done

# Ver los deploys y su evento disparador (push vs workflow_dispatch)
gh run list --workflow="Deploy to GitHub Pages" --limit 5 --json databaseId,createdAt,event,conclusion

# Forzar un deploy ya
gh workflow run deploy.yml --ref main
```

**Pitfall:** `workflow_dispatch` solo funciona si el archivo del workflow existe en la **rama por defecto**. Disparar un workflow nuevo desde una rama secundaria da `HTTP 404: Not Found`.

### Puntos mal otorgados / ranking que no cuadra (incidente oct-2026)

**Síntoma:** "cambiaron los puntos" — el ranking muestra un total y la base guarda otro, sin que nadie tocara la regla.

**Causa raíz típica:** la regla de puntuación vive en **DOS motores** — `scripts/lib/score-utils.js` (JS, lo usa el cron) y `src/lib/scoring.ts` (TS, lo usa el frontend). `verify-logic.js` **solo probaba el JS**, así que una divergencia entre ambos pasaba desapercibida.

**Fix:** `docs/SCORING_LOGIC.md` es la **fuente única de verdad** ("si el código contradice este documento, el bug está en el código") y `scripts/verify-engine-parity.js` compara ambos motores campo por campo contra los pronósticos reales de `officialEvaluatedPredictions.json` — debe reproducir el `points` guardado exactamente — más casos límite. El CI lo corre en cada PR (`.github/workflows/verify.yml`) y `deploy.yml` antes del build: una regla rota **bloquea el deploy**.

Diagnosticar:
```bash
npm run verify                       # 59 checks + paridad (es lo que corre el CI)
node scripts/verify-engine-parity.js # solo paridad, salida detallada
```

**Antes de reportar "no se otorgaron los puntos":** un `points = NULL` en un partido terminado casi siempre es la **regla anti-farmeo** (`isPredictionOnTime()` descarta pronósticos hechos después del pitazo — correcto por diseño). Comparar `created_at` de la predicción contra `match_date` del partido:
```bash
curl -s "$URL/rest/v1/predictions?select=id,user_id,points,created_at&match_id=eq.<match_id>" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```
Un fallo REAL es una predicción creada **antes** del pitazo que quedó con `points = NULL`.

**Nunca pases puntos por parámetro:** el motor los calcula. `scripts/assign-points.js` es LEGACY (ningún workflow lo invoca) y fue reescrito para ignorar cualquier `pointsAwarded` y llamar a `calculateScore()`.

**Candado activo (desde 2026-10-17, ya en `main`):** `npm run verify` corre en `.github/workflows/verify.yml` (cada PR y cada push a `main`) y otra vez dentro de `deploy.yml` **antes** del build. Si los dos motores divergen o un check de lógica falla, **el deploy no publica**. La rama de trabajo `fix/logica-puntuacion-definitiva` fue mergeada (fast-forward) y eliminada.

**Nunca escribas `points` a mano:** el trigger `trg_points_server_only` de la DB lo impide (solo `service_role`). Ver spec normativa en `docs/SCORING_LOGIC.md`.

### Estado del proyecto (vía MCP)

`supabase_get_project` → `status: ACTIVE_HEALTHY`. La DB se puede consultar con `supabase_execute_sql` (service role implícito).
