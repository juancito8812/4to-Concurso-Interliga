# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Reglas del proyecto

### Estructura

- **Landing principal:** `src/app/page.tsx` — Componente `"use client"` con datos hardcodeados (reglas, puntuación, premios, logos de ligas)
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Fetch client-side a ESPN API + datos de ejemplo
- **Autenticación:** Supabase Auth — registro, login, recuperación de contraseña
- **Base de datos:** Supabase PostgreSQL — tablas profiles, matches, predictions, prediction_scorers, teams, players
- **Colores:** Definidos en `src/app/globals.css` con `@theme` de Tailwind v4
- **Config de ligas:** `src/lib/leagueConfig.ts` — Colores y logos de ligas (fuente única)
- **Configuración:** `next.config.ts` — `basePath: "/4to-Concurso-Interliga"` es OBLIGATORIO para GitHub Pages

### Páginas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `src/app/page.tsx` | Landing principal |
| `/registro` | `src/app/registro/page.tsx` | Crear cuenta |
| `/login` | `src/app/login/page.tsx` | Iniciar sesión |
| `/olvide-contrasena` | `src/app/olvide-contrasena/page.tsx` | Recuperar contraseña |
| `/perfil` | `src/app/perfil/page.tsx` | Editar perfil (requiere auth) |
| `/pronosticar` | `src/app/pronosticar/page.tsx` | Hacer pronósticos (requiere auth) |
| `/mis-pronosticos` | `src/app/mis-pronosticos/page.tsx` | Historial (requiere auth) |
| `/ranking` | `src/app/ranking/page.tsx` | Tabla de posiciones |
| `/tabla/[league]` | `src/app/tabla/[league]/TablaLigaClient.tsx` | Tabla de posiciones por liga |

### Componentes

| Archivo | Descripción |
|---------|-------------|
| `src/app/Navbar.tsx` | Navbar con estado de auth y equipo del usuario |
| `src/app/Footer.tsx` | Footer con ligas, navegación, reglas, créditos |
| `src/app/TeamSelectorCard.tsx` | Selección de equipo en landing (bloqueada una vez elegida) |
| `src/app/CompetitionStatusCard.tsx` | Estado de competición (VIVO/KO) |
| `src/lib/leagueConfig.ts` | Colores y logos de ligas (compartido) |

### Base de datos (tablas Supabase)

- **profiles** — user_id, display_name, team_id (FK → teams)
- **teams** — name, league, logo_url (86+ equipos con logos de TheSportsDB)
- **players** — name, team, league, position (500+ jugadores)
- **matches** — home_team, away_team, match_date, league, result_home, result_away
- **predictions** — user_id, match_id, home_score, away_score, points (UNIQUE user_id+match_id)
- **prediction_scorers** — prediction_id, player_name, goals, team

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

### Liga colors (src/lib/leagueConfig.ts)

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

### Convenciones

- Usar clases de Tailwind, no CSS inline (excepto colores de liga que vienen de leagueConfig.ts)
- Los componentes de página usan `"use client"` porque necesitan hooks o datos dinámicos
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper
- No hay backend propio — todo es estático con fetch client-side
- Supabase se usa directamente desde el browser via JS client
- **Supabase foreign key relations return arrays, not objects** — hacer queries separadas
- `<Link>` auto-adds basePath; `<img>` NO — manual prefix requerido para img src

### Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ilkndkqcmxvlufxaugog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Copiar `.env.example` a `.env.local` y completar.

### Deploy

- Push a `main` triggers GitHub Actions → build → deploy a GitHub Pages
- `npm run build` genera `./out/` con archivos estáticos
- **NUNCA** agregar `basePath` a las URLs de fetch de API, solo a assets internos
- `.env.local` NO se commitea (está en .gitignore)

### Errores comunes

- Si los logos no se ven: verificar que las rutas en `img src` incluyan `/4to-Concurso-Interliga/` como prefijo
- Si el CSS no carga: verificar que `basePath` esté en `next.config.ts`
- Si las tablas no cargan: la API de ESPN funciona sin key, verificar CORS en browser
- Si auth no funciona: verificar que `.env.local` tenga las credenciales correctas de Supabase
- Si el build falla: verificar que no haya errores de TypeScript con `npm run build`
- Si los logos de equipo no se ven: TheSportsDB es rate-limited, usar delays de 3s entre requests
