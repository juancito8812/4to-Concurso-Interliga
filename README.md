# 4° Concurso Interliga

Concurso de pronósticos de fútbol para la temporada 2026-27. Los participantes eligen un equipo y compiten pronosticando resultados, marcadores y goleadores de las principales ligas y copas europeas.

## Stack

- **Framework:** Next.js 16 (App Router, static export)
- **React:** 19
- **Estilos:** Tailwind CSS v4
- **TypeScript:** 5
- **Deploy:** GitHub Pages (`output: "export"`)
- **APIs de Fútbol:**
  - `football-data.org` API (calendario y plantillas oficiales en vivo de la temporada 2026/27)
  - `src/data/officialFixtures.json` (1.406 partidos oficiales pre-sincronizados como fallback offline/CORS)
  - `src/data/officialPlayers.json` (3.031 jugadores oficiales 2026/27 de 95 clubes con posiciones traducidas)
  - ESPN API (tablas de posiciones y clasificaciones en vivo sin API key)
- **Auth y DB:** Supabase (autenticación + PostgreSQL)

## Estructura

```
src/
├── app/
│   ├── page.tsx                    # Landing principal
│   ├── layout.tsx                  # Layout con fuente DM Sans
│   ├── globals.css                 # Paleta de colores navy + gold
│   ├── providers.tsx               # AuthProvider wrapper
│   ├── Navbar.tsx                  # Navbar con estado de auth
│   ├── tabla/
│   │   └── [league]/
│   │       ├── page.tsx            # Genera rutas estáticas
│   │       └── TablaLigaClient.tsx # Tabla de posiciones (ESPN API)
│   ├── registro/page.tsx           # Registro de usuario
│   ├── login/page.tsx              # Inicio de sesión
│   ├── olvide-contrasena/page.tsx  # Recuperar contraseña
│   ├── perfil/page.tsx             # Editar perfil
│   ├── pronosticar/page.tsx        # Pronósticos estilo transmisión TV
│   ├── mis-pronosticos/page.tsx    # Historial de predicciones y puntos
│   └── ranking/page.tsx            # Tabla general de posiciones
├── data/
│   ├── officialFixtures.json       # Calendario oficial 2026/27 (1.406 partidos)
│   └── officialPlayers.json        # Plantillas oficiales 2026/27 (3.031 jugadores)
├── lib/
│   ├── supabase.ts                 # Cliente Supabase
│   ├── leagueConfig.ts             # Normalizador universal de ligas, torneos y equipos
│   ├── footballData.ts             # Cliente football-data.org + plantillas 2026/27
│   ├── espnApi.ts                  # Cliente ESPN API para tablas
│   └── scoring.ts                  # Motor de cálculo de puntajes
└── contexts/
    └── AuthContext.tsx             # Context de autenticación
public/
├── logos/                          # Logos oficiales de ligas (PNG)
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
| `/pronosticar` | Hacer pronósticos (estilo TV broadcast) | Sí |
| `/mis-pronosticos` | Historial de predicciones y puntos | Sí |
| `/ranking` | Tabla general de posiciones | No |
| `/tabla/laliga` | Clasificación LaLiga | No |
| `/tabla/premier` | Clasificación Premier League | No |
| `/tabla/seriea` | Clasificación Serie A | No |
| `/tabla/bundesliga` | Clasificación Bundesliga | No |
| `/tabla/champions` | Clasificación Champions League | No |
| `/tabla/europa` | Clasificación Europa League | No |
| `/tabla/conference` | Clasificación Conference League | No |
| `/tabla/coppaitalia` | Clasificación Copa Italia | No |

## Reglas y Funcionalidades de Pronósticos

- **Filtro:** El usuario solo visualiza los **3 siguientes partidos oficiales** de su equipo seleccionado.
- **Cierre:** El pronóstico se bloquea exactamente **10 minutos antes del inicio del partido** (`diffMin <= 10`).
- **Re-edición:** Se permite editar y actualizar los pronósticos libremente mientras falten más de 10 minutos para el inicio.
- **Plantillas Oficiales 2026/27:** Más de 3.000 jugadores actualizados con sus fichajes vigentes (Mbappé, Lamine Yamal, Haaland, Kane, De Ligt, Zirkzee, etc.) ordenados prioritariamente por posición (Delanteros y Mediocampistas primero).
- **Selector Progresivo de Goleadores:** Al presionar `+ Agregar goleador`, se despliega la plantilla del club; al elegir al jugador, se muestra el contador con balón `⚽ [-] 1 [+]` para ajustar goles.
- **Podio Oficial de Premios:** Sección de recompensas estilo Champions League con podio jerárquico (Oro 🥇, Plata 🥈, Bronce 🥉), halo radiante para el 1er lugar y desglose de artículos con chips temáticos (Camiseta oficial, short, balón, jarra de colección, gorra, etc.).
- **Competiciones y Equipos:** Detección automática y precisa de torneos europeos (Champions, Europa League, Conference League) y normalización canónica de equipos entre API y base de datos.

## Comandos

```bash
npm run dev      # Desarrollo local
npm run build    # Build estático (genera ./out)
npm run lint     # ESLint
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_FOOTBALL_DATA_KEY=733c2feed2bf441292e9779c91af2e09
```

## Deploy

Automático vía GitHub Actions al hacer push a `main`. Ver `.github/workflows/deploy.yml`.

**URL:** https://juancito8812.github.io/4to-Concurso-Interliga/
