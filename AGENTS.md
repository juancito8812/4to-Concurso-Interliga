# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Reglas del proyecto

### Estructura

- **Landing principal:** `src/app/page.tsx` — Componente `"use client"` con podio de premios, reglas y selector de club. Logos de ligas organizados en 3 filas: ligas nacionales, copas nacionales (parejas liga→copa), copas europeas centradas.
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación, goleadores y partidos vía ESPN API con fallback.
- **Pronósticos:** `src/app/pronosticar/page.tsx` — Ventana de 3 partidos estilo TV broadcast, panel de goleadores en 2 columnas y stepper de goles.
- **Historial de Pronósticos:** `src/app/mis-pronosticos/page.tsx` — Historial con desglose de puntos (+3 resultado, +2 marcador exacto, +1/+2 goleador).
- **Ranking General en Vivo:** `src/app/ranking/page.tsx` — Tabla global multiusuario conectada a Supabase, Podio de Honor y búsqueda.
- **Autenticación y Perfil:** `src/contexts/AuthContext.tsx` y `src/app/perfil/page.tsx` — Registro con username, login, recuperación de clave, reinicio de club y eliminación de cuenta.
- **Base de datos:** Supabase PostgreSQL — tablas `profiles`, `teams`, `players`, `matches`, `predictions`, `prediction_scorers`, `tournament_survivors`, `app_meta`.
- **Calendario oficial 2026/27:** `src/data/officialFixtures.json` — 1.650 partidos REALES verificados (0 fabricados): 4 ligas domésticas (football-data API), UCL fase liga + Copa Italia + DFB-Pokal (ESPN). Regenerable con `scripts/sync-official-fixtures.js` (idempotente); validación cruzada contra las fuentes con `scripts/validate-fixtures.js` (0 errores). UEL/UECL (sorteo del 28/8), FA Cup y Copa del Rey se sincronizan cuando las fuentes las publiquen (requieren extender el script).
- **Plantillas oficiales 2026/27:** `src/data/officialPlayers.json` — 4.749 jugadores de todos los clubes con posiciones (bundle + rosters ESPN reales vía `scripts/sync-player-squads.js`).
- **Normalización de Ligas y Equipos:** `src/lib/leagueConfig.ts` — `normalizeMatchLeague` y `normalizeTeamName` mapean nombres canónicos y competencias exactas.
- **Cliente Football API:** `src/lib/footballData.ts` — `getOfficialTeamMatches` y `getOfficialPlayersForTeams` con API en vivo + fallback de fixtures y plantillas oficiales pre-sincronizadas.
- **Colores:** Definidos en `src/app/globals.css` con `@theme` de Tailwind v4.
- **Configuración:** `next.config.ts` — `basePath: "/4to-Concurso-Interliga"` es OBLIGATORIO para GitHub Pages.

### Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing principal |
| `/registro` | `src/app/registro/page.tsx` | Crear cuenta con nombre de usuario |
| `/login` | `src/app/login/page.tsx` | Iniciar sesión |
| `/olvide-contrasena` | `src/app/olvide-contrasena/page.tsx` | Recuperar contraseña |
| `/actualizar-contrasena` | `src/app/actualizar-contrasena/page.tsx` | Destino del email de recuperación (nueva contraseña) |
| `/perfil` | `src/app/perfil/page.tsx` | Editar perfil, reiniciar datos (limpia survivors) y eliminar cuenta (requiere auth) |
| `/pronosticar` | `src/app/pronosticar/page.tsx` | Hacer pronósticos con ventana rodante de 3 partidos (requiere auth) |
| `/mis-pronosticos` | `src/app/mis-pronosticos/page.tsx` | Historial de pronósticos y puntos (requiere auth) |
| `/ranking` | `src/app/ranking/page.tsx` | Tabla de posiciones general y Podio de Honor en vivo |
| `/tabla/[league]` | `src/app/tabla/[league]/TablaLigaClient.tsx` | Tabla de posiciones, goleadores y partidos por liga |

### Componentes y Módulos Clave

| Archivo | Descripción |
|---------|-------------|
| `src/app/Navbar.tsx` | Navbar con nombre de usuario dinámico y dropdown |
| `src/app/Footer.tsx` | Footer con ligas, navegación, reglas, créditos |
| `src/app/TeamSelectorCard.tsx` | Selección y bloqueo de club en landing |
| `src/app/CompetitionStatusCard.tsx` | Estado de competición (VIVO/KO) |
| `src/lib/leagueConfig.ts` | Colores, logos, normalización de competiciones (`normalizeMatchLeague`), mapeo de nombres de equipos (`normalizeTeamName`), `matchIdToUuid`, `isKnockoutMatch`, `getKnockoutCupSlug`, `getKnockoutRound` |
| `src/lib/survivor.ts` | Lógica de supervivencia en 7 copas KO (`evaluateSurvivorProgression`), auto-suscripción (`getTeamCups`), consultas y transferencias (`getUserCupSurvivors`, `setInitialCupSurvivor`, `updateCupSurvivor`) |
| `src/lib/footballData.ts` | `getOfficialTeamMatches`, `getOfficialPlayersForTeams` (API + fallback de fixtures y 4.749 jugadores; en GitHub Pages saltea la API por CORS) |
| `src/lib/espnApi.ts` | Cliente ESPN API para tablas de posiciones, goleadores y partidos |
| `src/lib/espnResultsFetcher.ts` | Partidos finalizados ESPN en vivo para el cliente (caché 30s, `AbortSignal.timeout(10s)`) |
| `src/lib/scoring.ts` | Motor de cálculo de puntajes del concurso (+ `arePlayersMatching` fonético) |
| `src/data/teamAliases.json` | Fuente única: aliasMap (404 aliases), canonicalDbTeams (241 equipos), knockoutPairs y teamCups (225 equipos; consumido por TS y scripts) |
| `scripts/lib/score-utils.js` | Módulo CJS compartido: `normalizeTeamName`, `matchIdToUuid`, `calculateScore`, `isKnockoutMatch`, `isKnockoutCup`, `getKnockoutCupSlug`, `getKnockoutRound`, `getTeamCups`, `evaluateSurvivorProgression` |
| `scripts/auto-sync-espn-results.js` | Cron: ESPN (backfill 3 días) → JSON evaluados → persistencia en Supabase con service role key |
| `scripts/sync-official-fixtures.js` | Regenera el calendario SOLO desde fuentes reales (football-data API + ESPN + Wikipedia para equipos UEL/UECL); regenera `teamCups` y `knockoutPairs` |
| `scripts/validate-fixtures.js` | Validación cruzada de `officialFixtures.json` contra las fuentes (0 errores = calendario 100% real) |
| `scripts/sync-db.js` | Sincroniza Supabase: upsert de matches (sin pisar resultados), remapeo de predicciones a IDs reales, rebuild de la tabla teams (219 equipos) |
| `scripts/sync-player-squads.js` | Completa `officialPlayers.json` con rosters ESPN reales (UCL + Copa Italia) |
| `scripts/rebuild-eval-preds.js` | Reconstruye `officialEvaluatedPredictions.json` desde Supabase (source of truth) |
| `scripts/verify-logic.js` | 43 checks de lógica de negocio (scoring, normalización, KO, survivor, IDs) |
| `src/contexts/AuthContext.tsx` | Context de autenticación, perfil en vivo y `deleteAccount` |
| `src/data/officialEvaluatedMatches.json` | Resultados oficiales finalizados y goleadores reales |
| `src/data/officialEvaluatedPredictions.json` | Pronósticos evaluados y sincronizados |
| `scripts/evaluate-matches.js` | Evaluador CLI de partidos y cálculo de puntuación |
| `scripts/assign-points.js` | Asignación directa de puntos y pronósticos |
| `supabase/schema.sql` | Esquema DDL maestro con 8 tablas, índices, RLS y triggers |
| `DISASTER_RECOVERY_AND_SCHEMA.md` | Manual maestro de restauración total ante desastres |

### Base de datos (Supabase PostgreSQL)

- **profiles** — `user_id` (PK), `display_name`, `team_id` (FK → teams). Políticas RLS habilitan lectura pública para el ranking general.
- **teams** — `id`, `name`, `league`, `logo_url` (equipos reales 2026/27 sincronizados por `scripts/sync-db.js`).
- **players** — `name`, `team`, `league`, `position` (500+ jugadores en DB + 4.749 en bundle oficial).
- **matches** — `id` (IDs canónicos de fixtures), `home_team`, `away_team`, `match_date`, `league`, `result_home`, `result_away` (1.650 filas re-sembradas).
- **predictions** — `id`, `user_id`, `match_id`, `home_score`, `away_score`, `points` (UNIQUE user_id+match_id; FK → matches con IDs canónicos).
- **prediction_scorers** — `prediction_id`, `player_name`, `goals`, `team`. Escritura SOLO del dueño del pronóstico (IDOR fix).
- **tournament_survivors** — `id` (PK), `user_id` (FK → auth.users), `tournament_slug` (TEXT: 'champions', 'europa', 'conference', 'coppaitalia', 'facup', 'copadelrey', 'dfbpokal'), `active_team_id` (FK → teams), `status` ('ALIVE' | 'ELIMINATED'), `eliminated_at_round` (TEXT), `history` (JSONB: lista de transferencias de camisetas), `created_at`, `updated_at`. RLS: SELECT público, ALL restringido al propio usuario (`auth.uid() = user_id`).
- **app_meta** — tabla clave-valor (hash del calendario). Solo accesible por service role.
- **Trigger `handle_new_user`:** Al crearse un registro en `auth.users`, se inserta automáticamente en `profiles`.
- **RPC `delete_user_account`:** Función `SECURITY DEFINER` (solo `authenticated`) que purga predicciones, goleadores, tournament_survivors, perfiles y elimina la fila de `auth.users`, liberando el email inmediatamente.
- **Seguridad de escritura:** NO existen RPCs públicos de escritura. El cron (`scripts/auto-sync-espn-results.js`) escribe con la **service role key** (`SUPABASE_SERVICE_ROLE_KEY`, secreto de GitHub Actions) vía REST directo (bypass RLS).

### Paleta de colores (globals.css)

```
navy-black: #080e1c    (fondo principal)
navy-mid: #131d35      (fondo de cards)
navy-card: #1a2540     (fondo de inputs)
gold: #c9a84c          (acento principal)
gold-light: #d4b45e    (hover de gold)
gold-dark: #b8943f     (gold oscuro)
green: #1ed760         (éxito)
silver: #8a9bb5        (texto secundario)
border: #1e2d4a        (bordes)
```

### Ligas y Colores (src/lib/leagueConfig.ts)

```
Premier League: #3d195b (violeta)
LaLiga: #ee8707 (naranja)
Serie A: #024494 (azul)
Bundesliga: #d20515 (rojo)
Champions League: #1a4b8e (azul oscuro)
Europa League: #f37920 (naranja)
Conference League: #00843d (verde)
Copa Italia: #024494 (azul)
```

### Convenciones y Buenas Prácticas

- Usar clases de Tailwind CSS, no CSS inline (excepto colores dinámicos de liga).
- Los componentes interactivos usan `"use client"`.
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper.
- El cierre de pronósticos es a **1 minuto antes del inicio** (`diffMin <= 1`).
- Se permite **re-editar** pronósticos guardados mientras el partido esté abierto (`diffMin > 1`).
- Siempre usar `normalizeMatchLeague` y `normalizeTeamName` para asegurar correspondencia con plantillas y torneos.
- El selector de goleadores muestra la plantilla oficial completa (4.749 jugadores clasificados por posición) y despliega el contador `⚽ [-] 1 [+]` únicamente al elegir un jugador (máx. 5 goleadores por equipo).
- La sección de premios en la landing (`src/app/page.tsx`) presenta un Podio de Campeones con medallas metálicas (Oro 🥇, Plata 🥈, Bronce 🥉) y chips visuales independientes para cada artículo del kit.
- **Mecánica de Superviviente en Copas KO:** En Champions, Europa League, Conference League y Copa Italia, el participante compite de forma independiente (`tournament_survivors`). Si predice y acierta la victoria del equipo rival, hereda su camiseta (`active_team_id`) manteniendo intacto su club base en ligas (`profiles.team_id`).
- **Detección de partidos KO (`isKnockoutMatch`):** copas domésticas siempre KO; competiciones europeas (Champions/Europa/Conference) fase liga de sep a ene y rondas KO de feb a ago (por fecha, funciona con cruces TBD).
- **Rondas formato 2026/27 (`getKnockoutRound`):** feb = Dieciseisavos de Final (playoff R32), mar = Octavos, abr = Cuartos, abr-may = Semifinal, may = Final.
- La ventana de pronósticos (`/pronosticar`) filtra partidos con equipos `TBD` (placeholders hasta que las fuentes publiquen los cruces reales).
- `<Link>` agrega automáticamente `basePath`; `<img>` NO — requiere el prefijo manual `/4to-Concurso-Interliga/`.

### Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ilkndkqcmxvlufxaugog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_FOOTBALL_DATA_KEY=733c2feed2bf441292e9779c91af2e09
SUPABASE_SERVICE_ROLE_KEY=tu-service-key   # SOLO en GitHub Secrets y .env.local (nunca en el bundle)
```

### Seguridad

- La anon key es pública por diseño (va en el bundle del cliente); toda escritura sensible pasa por RLS o por la service role key del cron.
- Política de contraseñas (plan Free): mínimo 8 caracteres + mayúscula + número + símbolo (HIBP es solo Pro).
- `prediction_scorers`: escritura validada por ownership del pronóstico (EXISTS sobre predictions); lectura pública para ranking/cron.
- `app_meta`: sin grants para anon/authenticated — solo service role.
- No commitear `SUPABASE_SERVICE_ROLE_KEY` ni `.env.local` (gitignored).

### Deploy

- Push a `main` triggers GitHub Actions → build → deploy a GitHub Pages
- `npm run build` genera `./out/` con archivos estáticos
- `.env.local` NO se commitea (está en .gitignore)

### PWA (Progressive Web App)

- **Archivos:** `public/manifest.json`, `public/sw.js`, `public/icon.svg`
- **Componente:** `src/app/RegisterSW.tsx` — registra el service worker en el cliente
- **Meta tags en `layout.tsx`:** `manifest`, `apple-mobile-web-app-capable`, `theme-color` (#c9a84c), `viewport` (sin zoom)
- **Service worker:** network-first con fallback a caché offline
- **Instalación en Android (Chrome):** ícono "⋮" → "Instalar app"
- **Instalación en iOS (Safari):** ícono compartir □↑ → "Agregar a pantalla de inicio"

### Operaciones y Troubleshooting

- **Auth caído (nadie puede loguearse):** Si los endpoints `/auth/v1/*` se cuelgan (timeout) pero REST (`/rest/v1/*`) responde 200 y el proyecto figura `ACTIVE_HEALTHY`, el servicio GoTrue está colgado. Reiniciar el proyecto (NO tocar código):
  ```bash
  curl -X POST "https://api.supabase.com/v1/projects/ilkndkqcmxvlufxaugog/restart" \
    -H "Authorization: Bearer <MANAGEMENT_API_TOKEN>"
  ```
  El token `sbp_...` está en `~/.config/opencode/opencode.jsonc`. Verificar luego con `GET /auth/v1/health` (debe devolver 200 con `"version":"v2.x"`). Incidente de referencia: status.supabase.com "401 errors due to JWT rejections" (ago-2026).
- **Rebotes de email de Supabase:** Las cuentas sin confirmar (`confirmed_at IS NULL` en `auth.users`) son las que generan rebotes (el email de confirmación se envía a direcciones que pueden no existir). Para diagnosticar: `SELECT email, created_at FROM auth.users WHERE confirmed_at IS NULL`. Eliminar cuentas de testing/obsoletas con DELETE de `profiles` + `auth.users` (verificar dependencias primero). NO probar registros con emails inventados.
- **Estado del proyecto:** `supabase_get_project` (MCP) → `status: ACTIVE_HEALTHY`. La DB se puede consultar con `supabase_execute_sql` (MCP, service role implícito).
- **Verificación rápida de salud:** `node scripts/verify-logic.js` (43 checks), `node scripts/validate-fixtures.js` (0 errores), `node scripts/test-survivor.js` (12/12), `npx tsc --noEmit`, `npm run build`.
