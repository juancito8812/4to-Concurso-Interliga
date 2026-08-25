# 4° Concurso Interliga

Concurso de pronósticos de fútbol para la temporada 2026-27. Los participantes eligen un equipo y compiten pronosticando resultados, marcadores y goleadores de las principales ligas y copas europeas.

## Stack

- **Framework:** Next.js 16 (App Router, static export)
- **React:** 19
- **Estilos:** Tailwind CSS v4
- **TypeScript:** 5
- **Deploy:** GitHub Pages (`output: "export"`)
- **API:** ESPN API (tablas de posiciones)
- **Auth y DB:** Supabase (autenticación + PostgreSQL)

## Estructura

```
src/app/
├── page.tsx                    # Página principal (landing)
├── layout.tsx                  # Layout con fuente DM Sans
├── globals.css                 # Paleta de colores navy + gold
├── providers.tsx               # AuthProvider wrapper
├── Navbar.tsx                  # Navbar con estado de auth
├── tabla/
│   └── [league]/
│       ├── page.tsx            # Genera rutas estáticas
│       └── TablaLigaClient.tsx # Tabla de posiciones (client)
├── registro/page.tsx           # Registro de usuario
├── login/page.tsx              # Inicio de sesión
├── olvide-contrasena/page.tsx  # Recuperar contraseña
├── perfil/page.tsx             # Editar perfil
├── pronosticar/page.tsx        # Hacer pronósticos
├── mis-pronosticos/page.tsx    # Historial de predicciones
├── ranking/page.tsx            # Tabla de posiciones
src/lib/
└── supabase.ts                 # Cliente Supabase
src/contexts/
└── AuthContext.tsx             # Context de autenticación
public/
├── logos/                      # Logos de ligas (PNG)
└── ...
```

## Rutas

| Ruta | Descripción | Auth |
|------|-------------|------|
| `/` | Landing principal | No |
| `/registro` | Crear cuenta | No |
| `/login` | Iniciar sesión | No |
| `/olvide-contrasena` | Recuperar contraseña | No |
| `/perfil` | Editar perfil | Sí |
| `/pronosticar` | Hacer pronósticos | Sí |
| `/mis-pronosticos` | Historial de predicciones | Sí |
| `/ranking` | Tabla de posiciones | No |
| `/tabla/laliga` | Clasificación LaLiga | No |
| `/tabla/premier` | Clasificación Premier League | No |
| `/tabla/seriea` | Clasificación Serie A | No |
| `/tabla/bundesliga` | Clasificación Bundesliga | No |
| `/tabla/champions` | Clasificación Champions League | No |
| `/tabla/europa` | Clasificación Europa League | No |
| `/tabla/conference` | Clasificación Conference League | No |
| `/tabla/coppaitalia` | Clasificación Copa Italia | No |

## Comandos

```bash
npm run dev      # Desarrollo local
npm run build    # Build estático (genera ./out)
npm run lint     # ESLint
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar con credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## Base de datos (Supabase)

Tablas requeridas:

- `profiles` — Perfiles extendidos (user_id, display_name)
- `matches` — Partidos programados (home_team, away_team, match_date, results)
- `predictions` — Pronósticos de usuarios (user_id, match_id, scores, points)

Ver `AGENTS.md` para el SQL completo de creación de tablas.

## Configuración importante

- `next.config.ts`: `basePath: "/4to-Concurso-Interliga"` (obligatorio para GitHub Pages)
- `next.config.ts`: `trailingSlash: true` (necesario para rutas estáticas)
- Las imágenes usan `unoptimized: true` (requisito para export estático)

## Deploy

Automático vía GitHub Actions al hacer push a `main`. Ver `.github/workflows/deploy.yml`.

**URL:** https://juancito8812.github.io/4to-Concurso-Interliga/
