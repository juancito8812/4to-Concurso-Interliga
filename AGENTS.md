# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Reglas del proyecto

### Estructura

- **Landing principal:** `src/app/page.tsx` — Componente `"use client"` con datos y reglas del concurso.
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Fetch client-side a ESPN API.
- **Pronósticos:** `src/app/pronosticar/page.tsx` — Marcadores TV broadcast y 2 columnas de goleadores con selector progresivo.
- **Historial de Pronósticos:** `src/app/mis-pronosticos/page.tsx` — Historial con desglose de puntos.
- **Autenticación:** Supabase Auth — registro, login, recuperación de contraseña.
- **Base de datos:** Supabase PostgreSQL — tablas `profiles`, `teams`, `players`, `matches`, `predictions`, `prediction_scorers`.
- **Calendario oficial 2026/27:** `src/data/officialFixtures.json` — 1.406 partidos de Premier, LaLiga, Serie A y Bundesliga.
- **Normalización de Ligas y Equipos:** `src/lib/leagueConfig.ts` — `normalizeMatchLeague` y `normalizeTeamName` mapean nombres canónicos y competencias exactas.
- **Cliente Football API:** `src/lib/footballData.ts` — `getOfficialTeamMatches` con API en vivo + fallback de calendario oficial pre-sincronizado.
- **Colores:** Definidos en `src/app/globals.css` con `@theme` de Tailwind v4.
- **Configuración:** `next.config.ts` — `basePath: "/4to-Concurso-Interliga"` es OBLIGATORIO para GitHub Pages.

### Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing principal |
| `/registro` | `src/app/registro/page.tsx` | Crear cuenta |
| `/login` | `src/app/login/page.tsx` | Iniciar sesión |
| `/olvide-contrasena` | `src/app/olvide-contrasena/page.tsx` | Recuperar contraseña |
| `/perfil` | `src/app/perfil/page.tsx` | Editar perfil (requiere auth) |
| `/pronosticar` | `src/app/pronosticar/page.tsx` | Hacer pronósticos (requiere auth) |
| `/mis-pronosticos` | `src/app/mis-pronosticos/page.tsx` | Historial de pronósticos y puntos (requiere auth) |
| `/ranking` | `src/app/ranking/page.tsx` | Tabla de posiciones general |
| `/tabla/[league]` | `src/app/tabla/[league]/TablaLigaClient.tsx` | Tabla de posiciones por liga |

### Componentes y Módulos Clave

| Archivo | Descripción |
|---------|-------------|
| `src/app/Navbar.tsx` | Navbar con estado de auth y equipo del usuario |
| `src/app/Footer.tsx` | Footer con ligas, navegación, reglas, créditos |
| `src/app/TeamSelectorCard.tsx` | Selección de equipo en landing (bloqueada una vez elegida) |
| `src/app/CompetitionStatusCard.tsx` | Estado de competición (VIVO/KO) |
| `src/lib/leagueConfig.ts` | Colores, logos, normalización de competiciones (`normalizeMatchLeague`) y mapeo de nombres de equipos (`normalizeTeamName`) |
| `src/lib/footballData.ts` | `getOfficialTeamMatches` (API + fallback pre-empaquetado) |
| `src/lib/espnApi.ts` | Cliente ESPN API para tablas de posiciones |
| `src/lib/scoring.ts` | Motor de cálculo de puntajes del concurso |

### Base de datos (tablas Supabase)

- **profiles** — `user_id`, `display_name`, `team_id` (FK → teams)
- **teams** — `name`, `league`, `logo_url` (89 equipos canónicos)
- **players** — `name`, `team`, `league`, `position` (500+ jugadores con FK lógica hacia teams)
- **matches** — `home_team`, `away_team`, `match_date`, `league`, `result_home`, `result_away`
- **predictions** — `user_id`, `match_id`, `home_score`, `away_score`, `points` (UNIQUE user_id+match_id)
- **prediction_scorers** — `prediction_id`, `player_name`, `goals`, `team`

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
- El selector de goleadores muestra la plantilla completa y despliega el contador `⚽ [-] 1 [+]` únicamente al elegir un jugador.
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
