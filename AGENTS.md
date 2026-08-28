# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Reglas del proyecto

### Estructura

- **Landing principal:** `src/app/page.tsx` — Componente `"use client"` con podio de premios, reglas y selector de club.
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación, goleadores y partidos vía ESPN API con fallback.
- **Pronósticos:** `src/app/pronosticar/page.tsx` — Ventana de 3 partidos estilo TV broadcast, panel de goleadores en 2 columnas y stepper de goles.
- **Historial de Pronósticos:** `src/app/mis-pronosticos/page.tsx` — Historial con desglose de puntos (+3 resultado, +2 marcador exacto, +1/+2 goleador).
- **Ranking General en Vivo:** `src/app/ranking/page.tsx` — Tabla global multiusuario conectada a Supabase, Podio de Honor y búsqueda.
- **Autenticación y Perfil:** `src/contexts/AuthContext.tsx` y `src/app/perfil/page.tsx` — Registro con username, login, recuperación de clave, reinicio de club y eliminación de cuenta.
- **Base de datos:** Supabase PostgreSQL — tablas `profiles`, `teams`, `players`, `matches`, `predictions`, `prediction_scorers`.
- **Calendario oficial 2026/27:** `src/data/officialFixtures.json` — 1.842 partidos oficiales de las 8 competiciones.
- **Plantillas oficiales 2026/27:** `src/data/officialPlayers.json` — 3.822 jugadores de todos los clubes con posiciones y fichajes actualizados.
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
| `/perfil` | `src/app/perfil/page.tsx` | Editar perfil, reiniciar datos y eliminar cuenta (requiere auth) |
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
| `src/lib/leagueConfig.ts` | Colores, logos, normalización de competiciones (`normalizeMatchLeague`) y mapeo de nombres de equipos (`normalizeTeamName`) |
| `src/lib/survivor.ts` | Lógica de supervivencia en copas KO (`evaluateSurvivorProgression`), consultas y estado de transferencias (`getUserCupSurvivors`, `setInitialCupSurvivor`, `updateCupSurvivor`) |
| `src/lib/footballData.ts` | `getOfficialTeamMatches`, `getOfficialPlayersForTeams` (API + fallback de fixtures y 3.822 jugadores) |
| `src/lib/espnApi.ts` | Cliente ESPN API para tablas de posiciones, goleadores y partidos |
| `src/lib/scoring.ts` | Motor de cálculo de puntajes del concurso |
| `src/contexts/AuthContext.tsx` | Context de autenticación, perfil en vivo y `deleteAccount` |
| `supabase/schema.sql` | Esquema DDL maestro con 7 tablas, 15 índices, RLS, triggers y 89 equipos |
| `DISASTER_RECOVERY_AND_SCHEMA.md` | Manual maestro de restauración total ante desastres |

### Base de datos (Supabase PostgreSQL)

- **profiles** — `user_id` (PK), `display_name`, `team_id` (FK → teams). Políticas RLS habilitan lectura pública para el ranking general.
- **teams** — `id`, `name`, `league`, `logo_url` (89 equipos canónicos).
- **players** — `name`, `team`, `league`, `position` (500+ jugadores en DB + 3.822 en bundle oficial).
- **matches** — `id`, `home_team`, `away_team`, `match_date`, `league`, `result_home`, `result_away`.
- **predictions** — `id`, `user_id`, `match_id`, `home_score`, `away_score`, `points` (UNIQUE user_id+match_id).
- **prediction_scorers** — `prediction_id`, `player_name`, `goals`, `team`.
- **tournament_survivors** — `id` (PK), `user_id` (FK → auth.users), `tournament_slug` (TEXT: 'champions', 'europa', 'conference', 'coppaitalia'), `active_team_id` (FK → teams), `status` ('ALIVE' | 'ELIMINATED'), `eliminated_at_round` (TEXT), `history` (JSONB: lista de transferencias de camisetas), `created_at`, `updated_at`. RLS: SELECT público, ALL restringido al propio usuario (`auth.uid() = user_id`).
- **Trigger `handle_new_user`:** Al crearse un registro en `auth.users`, se inserta automáticamente en `profiles`.
- **RPC `delete_user_account`:** Función `SECURITY DEFINER` que purga predicciones, goleadores, tournament_survivors, perfiles y elimina la fila de `auth.users`, liberando el email inmediatamente.

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
- El cierre de pronósticos es a los **10 minutos antes del inicio** (`diffMin <= 10`).
- Se permite **re-editar** pronósticos guardados mientras el partido esté abierto (`diffMin > 10`).
- Siempre usar `normalizeMatchLeague` y `normalizeTeamName` para asegurar correspondencia con plantillas y torneos.
- El selector de goleadores muestra la plantilla oficial completa (3.822 jugadores clasificados por posición) y despliega el contador `⚽ [-] 1 [+]` únicamente al elegir un jugador.
- La sección de premios en la landing (`src/app/page.tsx`) presenta un Podio de Campeones con medallas metálicas (Oro 🥇, Plata 🥈, Bronce 🥉) y chips visuales independientes para cada artículo del kit.
- **Mecánica de Superviviente en Copas KO:** En Champions, Europa League, Conference League y Copa Italia, el participante compite de forma independiente (`tournament_survivors`). Si predice y acierta la victoria del equipo rival, hereda su camiseta (`active_team_id`) manteniendo intacto su club base en ligas (`profiles.team_id`).
- `<Link>` agrega automáticamente `basePath`; `<img>` NO — requiere el prefijo manual `/4to-Concurso-Interliga/`.

### Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ilkndkqcmxvlufxaugog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_FOOTBALL_DATA_KEY=733c2feed2bf441292e9779c91af2e09
```

### Deploy

- Push a `main` triggers GitHub Actions → build → deploy a GitHub Pages
- `npm run build` genera `./out/` con archivos estáticos
- `.env.local` NO se commitea (está en .gitignore)
