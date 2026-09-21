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
- El selector de goleadores muestra la plantilla oficial completa (7.252 jugadores) y despliega el contador `[-] 1 [+]` únicamente al elegir un jugador (máx. 5 goleadores por equipo).
- `<Link>` genera rutas relativas automáticamente; `<img>` usa rutas absolutas desde la raíz (`/logos/...`).

### Datos dinámicos (fetch desde public/data/)

- `officialPlayers.json` (809KB) y `officialFixtures.json` (566KB) **NO** se importan estáticamente en JS.
- Se cargan vía `loadData()` de `src/lib/dataLoader.ts` con cache en memoria (una sola petición HTTP por sesión).
- Los 4 JSONs de datos están en `public/data/` como assets estáticos servidos por CDN.
- **Sincronización Dual Obligatoria**: Al modificar `src/data/officialFixtures.json` o `officialEvaluatedMatches.json`, **SIEMPRE** copiar la copia exacta a `public/data/` para que la CDN sirva los 1.672 partidos con sus horarios oficiales.
- **Validación de Fechas en Ventana Rodante**: Usar `isMatchDateValid` para que partidos con horarios no configurados o medianoche (`00:00:00Z`) permanezcan activos durante toda su fecha.
- Para agregar un nuevo archivo de datos: copiarlo a `public/data/`, importarlo con `loadData("/data/archivo.json")` en el componente que lo necesite.

### Reglas del concurso — doble capa (cliente + BASE)

Desde la migración `supabase/migrations/2026-09-16_security_hardening.sql`, **toda regla
de negocio debe existir también en la base**: el cliente se evade con la anon key pública
(que es pública por diseño) + una sesión propia (el registro es abierto).

- **Cierre de pronósticos**: `diffMin <= 1` en el cliente **y** `public.is_match_open_for_prediction(match_id)` en las políticas RLS de `predictions`/`prediction_scorers`. Fuera de ventana: INSERT bloqueado, UPDATE 0 filas.
- **Sin puntaje retroactivo**: el cron descarta todo pronóstico con `created_at` posterior al cierre efectivo (`isPredictionOnTime` de `scripts/lib/score-utils.js`). Los registros ya archivados con puntos quedan grandfathereados (son el registro histórico y respaldo de recuperación).
- **Goleadores**: un jugador una sola vez por pronóstico (`prediction_scorers_unique_player`), máximo 5 por equipo (`trg_enforce_max_scorers`), `goals` entre 1 y 10, y el motor de scoring acredita cada goleador real una sola vez.
- **Superviviente KO**: el cliente solo crea su fila inicial (club propio, `ALIVE`, historial vacío) o la borra. La progresión, las transferencias y la eliminación las persiste **solo el cron** con service role key — `upsertCupSurvivor` no se usa desde el cliente.
- **Club bloqueado**: cambiar `profiles.team_id` fuera de `public.reset_participation()` lanza excepción (`trg_enforce_team_lock`). El "Reiniciar participación" del perfil llama a ese RPC (borra todo y deja los puntos en 0).
- **Horarios a medianoche (`00:00:00Z`)**: se evalúan como jornada vespertina (20:00 UTC) en el cliente, en la base (`effective_kickoff`) y en el cron. Si cambiás uno, cambiá los tres.
- **Cron `--dry-run`**: `node scripts/auto-sync-espn-results.js --dry-run` hace todas las lecturas y reporta lo que haría sin escribir nada (ni en Supabase ni en los JSON).

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

### Estado del proyecto (vía MCP)

`supabase_get_project` → `status: ACTIVE_HEALTHY`. La DB se puede consultar con `supabase_execute_sql` (service role implícito).
