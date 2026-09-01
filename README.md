# 4° Concurso Interliga

**Fútbol + Camiseta + Pasión.** Plataforma oficial de pronósticos de fútbol para la temporada 2026–27. Los participantes eligen su club favorito y compiten pronosticando resultados, marcadores exactos y goleadores en las principales ligas y copas europeas. Modo **PWA instalable** en Android e iOS.

**Sitio Web Oficial:** [futbolcamisetapasion.com](https://futbolcamisetapasion.com)

---

## Tabla de Contenidos

- [Stack Tecnológico](#-stack-tecnológico)
- [Características Principales](#-características-principales)
- [Competiciones Cubiertas](#-competiciones-cubiertas)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Rutas de la Aplicación](#-rutas-de-la-aplicación)
- [Reglas y Mecánicas del Concurso](#-reglas-y-mecánicas-del-concurso)
- [Automatización 100% (Cron)](#-automatización-100-cron)
- [Base de Datos](#-base-de-datos)
- [Seguridad y RLS](#-seguridad-y-rls)
- [Variables de Entorno](#-variables-de-entorno)
- [Desarrollo Local](#-desarrollo-local)
- [Despliegue en Producción](#-despliegue-en-producción)
- [PWA (Progressive Web App)](#-pwa-progressive-web-app)
- [Recuperación ante Desastres](#-recuperación-ante-desastres)
- [Troubleshooting](#-troubleshooting)
- [Licencia](#-licencia)

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) — App Router, exportación estática (`output: "export"`) |
| **Frontend & UI** | React 19, Tailwind CSS v4 (paleta custom en `globals.css` con `@theme`) |
| **Tipografía** | DM Sans (Google Fonts) — pesos extremos 400–900 |
| **Lenguaje** | TypeScript 5 en modo estricto |
| **Base de Datos & Auth** | [Supabase](https://supabase.com/) — Autenticación + PostgreSQL con RLS y service role |
| **Datos de Fútbol** | ESPN API pública (tablas, goleadores, en vivo) + football-data.org (fixtures) |
| **Calendario Oficial** | `src/data/officialFixtures.json` — **1.650 partidos reales** pre-sincronizados |
| **Plantillas Oficiales** | `src/data/officialPlayers.json` — **4.749 jugadores** clasificados por posición |
| **Deploy** | GitHub Actions → GitHub Pages, dominio personalizado (Cloudflare DNS) |
| **PWA** | Service Worker offline-first, manifest, icon SVG |

---

## 🎯 Características Principales

### Pronósticos estilo TV Broadcast
- Ventana rodante de **3 próximos partidos** del club elegido con tarjetas estilo transmisión.
- Selección de **goleadores** con panel integrado por equipo (máx. 5 goleadores) y stepper de goles.
- Cierre de pronósticos **1 minuto antes del pitazo** con re-edición libre mientras esté abierto.

### Ranking Multiusuario en Vivo
- Tabla de clasificación global con datos en tiempo real desde Supabase.
- **Podio de Honor** con medallas 🥇🥈🥉, puntos y escudos oficiales.
- Búsqueda instantánea por nombre de usuario.

### Superviviente en Copas Knockout
- **7 copas knockout:** Champions League, Europa League, Conference League, Copa Italia, FA Cup, Copa del Rey y DFB-Pokal.
- Si predicen y aciertan la victoria del rival, **heredan la camiseta** del rival para las siguientes fases.
- El club base en liga regular **permanece 100% fijo** — las copas KO son independientes.
- Visualización del estado VIVO/KO y equipo activo en landing, pronósticos e historial.

### Tablas de Posiciones por Liga
- Clasificación, máximos goleadores y calendario de partidos vía ESPN API.
- 9 competiciones disponibles en rutas estáticas generadas con `generateStaticParams`.

### Gestión de Cuenta
- Registro con nombre de usuario obligatorio, login y recuperación de contraseña.
- Edición de perfil, reinicio de club (limpia survivors) y **eliminación total de cuenta** que libera el email para nuevos registros.

### Diseño Premium
- Paleta oscura navy con acentos dorados que evocan trofeos y victoria.
- Badges de color por liga (violeta Premier, naranja LaLiga, azul Serie A, rojo Bundesliga, etc.).
- Responsive optimizado para mobile con instalación PWA nativa.

---

## ⚽ Competiciones Cubiertas

### Ligas Domésticas
| Competición | Color | Fuente |
|------------|-------|--------|
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League | `#3d195b` violeta | football-data.org |
| 🇪🇸 LaLiga | `#ee8707` naranja | football-data.org |
| 🇮🇹 Serie A | `#024494` azul | football-data.org |
| 🇩🇪 Bundesliga | `#d20515` rojo | football-data.org |

### Copas Europeas
| Competición | Color | Fuente |
|------------|-------|--------|
| 🏆 UEFA Champions League | `#1a4b8e` azul oscuro | ESPN |
| 🟠 UEFA Europa League | `#f37920` naranja | ESPN |
| 🟢 UEFA Conference League | `#00843d` verde | ESPN |

### Copas Nacionales
| Competición | Color | Fuente |
|------------|-------|--------|
| 🇮🇹 Copa Italia | `#024494` azul | ESPN |
| 🇩🇪 DFB-Pokal | `#d20515` rojo | ESPN |
| 🏴󠁧󠁢󠁥󠁮󠁧󠁿 FA Cup | `#f43f5e` rosa | Sorteo pendiente (UI, logos y lógica KO habilitados) |
| 🇪🇸 Copa del Rey | `#eab308` amarillo | Sorteo pendiente (UI, logos y lógica KO habilitados) |

---

## 📂 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    # Landing principal con Podio de Premios y Reglas
│   ├── layout.tsx                  # Layout raíz con tema oscuro navy + gold y metadatos PWA
│   ├── globals.css                 # Variables de diseño y paleta de colores Tailwind v4
│   ├── providers.tsx               # AuthProvider context wrapper
│   ├── RegisterSW.tsx              # Registro del service worker PWA
│   ├── Navbar.tsx                  # Barra de navegación con nombre de usuario y dropdown
│   ├── Footer.tsx                  # Pie de página con accesos directos y créditos
│   ├── TeamSelectorCard.tsx        # Selección y bloqueo de club del participante
│   ├── CompetitionStatusCard.tsx   # Estado de la competición (En Vivo / KO)
│   ├── actualizar-contrasena/
│   │   └── page.tsx                # Destino del email de recuperación (nueva contraseña)
│   ├── registro/
│   │   └── page.tsx                # Registro con nombre de usuario obligatorio
│   ├── login/
│   │   └── page.tsx                # Inicio de sesión
│   ├── olvide-contrasena/
│   │   └── page.tsx                # Recuperación de clave por correo
│   ├── perfil/
│   │   └── page.tsx                # Edición de perfil, reinicio de datos y eliminación de cuenta
│   ├── pronosticar/
│   │   └── page.tsx                # Pronósticos estilo TV con ventana de 3 partidos
│   ├── mis-pronosticos/
│   │   └── page.tsx                # Historial de predicciones, estado y desglose de puntos
│   ├── ranking/
│   │   └── page.tsx                # Ranking general en vivo, Podio de Honor y búsqueda
│   └── tabla/
│       └── [league]/
│           ├── page.tsx            # Generador de rutas estáticas (SSG)
│           └── TablaLigaClient.tsx # Clasificación, goleadores y calendario (ESPN API)
├── contexts/
│   └── AuthContext.tsx             # Context de autenticación, perfil y gestión de cuenta
├── data/
│   ├── officialFixtures.json       # Calendario oficial 2026/27 (1.650 partidos reales)
│   ├── officialPlayers.json        # Plantillas oficiales 2026/27 (4.749 jugadores)
│   ├── officialEvaluatedMatches.json  # Resultados oficiales finalizados y goleadores reales
│   ├── officialEvaluatedPredictions.json  # Pronósticos evaluados y sincronizados
│   └── teamAliases.json            # Fuente única de normalización (404 aliases, 241 equipos, 225 teamCups)
└── lib/
    ├── supabase.ts                 # Cliente Supabase
    ├── survivor.ts                 # Motor de supervivencia y herencia de camisetas en copas KO
    ├── leagueConfig.ts             # Normalizador canónico de ligas, torneos y equipos
    ├── footballData.ts             # Cliente football-data.org + plantillas oficiales 2026/27
    ├── espnApi.ts                  # Cliente ESPN API para tablas, goleadores y partidos
    ├── espnResultsFetcher.ts       # Partidos finalizados ESPN en vivo (caché 30s, rango 3 días)
    └── scoring.ts                  # Motor de cálculo y auditoría de puntuación

scripts/
├── auto-sync-espn-results.js       # Cron: ESPN → evaluación de puntos/survivors → Supabase
├── sync-official-fixtures.js       # Regenera calendario SOLO desde fuentes reales
├── validate-fixtures.js            # Validación cruzada del calendario (0 errores)
├── sync-db.js                      # Sincroniza Supabase: matches, remapeo de predicciones, teams
├── sync-player-squads.js           # Completa plantillas con rosters ESPN reales
├── rebuild-eval-preds.js           # Reconstruye predicciones evaluadas desde Supabase
├── verify-logic.js                 # 43 checks de lógica de negocio
├── evaluate-matches.js             # Evaluador CLI de partidos y puntos
├── assign-points.js                # Asignación directa de pronósticos y puntos
├── test-survivor.js                # Suite de pruebas del sistema de superviviente (12/12)
└── lib/
    └── score-utils.js              # Módulo compartido CJS (normalización, scoring, survivor)

supabase/
└── schema.sql                      # Script DDL maestro: 8 tablas, índices, RLS, triggers

.github/workflows/
├── deploy.yml                      # Build y deploy a GitHub Pages (push a main)
└── auto-evaluate-matches.yml       # Cron cada 2h: sync ESPN + evaluar + persistir

public/
├── manifest.json                   # PWA manifest
├── sw.js                           # Service Worker offline-first
├── icon.svg                        # Icono de la aplicación
├── .nojekyll                       # Evita que GitHub Pages ignore _next/
├── CNAME                           # Dominio personalizado
└── logos/                          # Escudos de las 9 competiciones (SVG/PNG)
```

---

## 🧭 Rutas de la Aplicación

| Ruta | Descripción | Auth |
|------|-------------|:----:|
| `/` | Landing principal, selector de equipo y podio de premios | No |
| `/registro` | Creación de cuenta con nombre de usuario | No |
| `/login` | Inicio de sesión | No |
| `/olvide-contrasena` | Solicitud de restablecimiento de contraseña | No |
| `/actualizar-contrasena` | Destino del email de recuperación (nueva contraseña) | No |
| `/perfil` | Edición de nombre de usuario, reinicio de club y eliminación de cuenta | **Sí** |
| `/pronosticar` | Envío y re-edición de pronósticos en tarjetas estilo TV | **Sí** |
| `/mis-pronosticos` | Historial de pronósticos enviados y desglose de puntos | **Sí** |
| `/ranking` | Tabla de clasificación general en vivo y Podio de Honor | No |
| `/tabla/laliga` | Tabla de posiciones oficial de LaLiga | No |
| `/tabla/premier` | Tabla de posiciones oficial de Premier League | No |
| `/tabla/seriea` | Tabla de posiciones oficial de Serie A | No |
| `/tabla/bundesliga` | Tabla de posiciones oficial de Bundesliga | No |
| `/tabla/champions` | Tabla de posiciones oficial de UEFA Champions League | No |
| `/tabla/europa` | Tabla de posiciones oficial de UEFA Europa League | No |
| `/tabla/conference` | Tabla de posiciones oficial de UEFA Conference League | No |
| `/tabla/coppaitalia` | Tabla de posiciones oficial de Copa Italia | No |
| `/tabla/dfbpokal` | Tabla de posiciones oficial de DFB-Pokal | No |

---

## ⚡ Reglas y Mecánicas del Concurso

### 1. Sistema de Puntuación Oficial

| Puntos | Concepto |
|--------|----------|
| **+3** | Resultado general correcto (acertar si gana local, empate o gana visitante) |
| **+2** | Marcador exacto acertado (ej. 2-1) |
| **+1** | Diferencia de 1 gol total en el marcador (cuando no es exacto, ej. predije 2-1 y fue 2-0) |
| **+1** | Por cada autor de gol acertado (nombre) |
| **+2** | Cantidad exacta de goleadores del partido (si predijiste N goleadores y hubo N reales) |

> **Matching inteligente de goleadores:** El motor de scoring usa matching fonético (`arePlayersMatching`) que acepta variantes de escritura — iniciales (`N. Williams` = `Nico Williams`), acentos (`Gonçalo Ramos` = `Gonzalo Ramos`), y variaciones ortográficas (ç/z/s → s, b/v → b). Los nombres se normalizan antes de comparar.

### 2. Ventana Rodante de Pronósticos (Rolling 3 Matches)

- Cada participante visualiza exactamente los **3 próximos partidos oficiales** de su club elegido.
- Cuando un partido finaliza, sale de la lista y la ventana **avanza automáticamente al siguiente partido** del calendario.
- Los pronósticos se muestran con logos oficiales, escudos de liga y tarjetas estilo transmisión TV.

### 3. Regla de Cierre de 1 Minuto y Re-edición

- Cada encuentro se bloquea para edición **1 minuto antes de su pitazo inicial** (`diffMin <= 1`).
- Mientras falte más de 1 minuto, los pronósticos pueden modificarse y guardarse tantas veces como se desee.

### 4. Goleadores en Doble Columna Simétrica

- Panel integrado debajo de cada club con dropdown clasificado por posición (Delanteros y Centrocampistas primero).
- Selector de goles `[-] N [+]` con un máximo de **5 goleadores por equipo**.
- Base de datos de **4.749 jugadores oficiales** clasificados por posición y equipo.

### 5. Ranking General en Vivo Multiusuario

- Sincronización en tiempo real de todos los usuarios registrados en Supabase con clubes y puntuaciones.
- **Podio de Honor** con medallas de Oro 🥇, Plata 🥈 y Bronce 🥉, coronas de líder y búsqueda instantánea.
- Tarjetas de métricas uniformes: Participantes, Líder y Reglas.

### 6. Gestión de Cuenta y Privacidad

- **Reinicio de Participación:** Permite reiniciar pronósticos a 0 puntos y elegir otro club. Limpia el estado de supervivencia en todas las copas KO.
- **Eliminación Total de Cuenta (`delete_user_account`):** Borra permanentemente predicciones, goleadores, tournament_survivors, perfil y la fila de `auth.users`, **liberando el correo electrónico** inmediatamente para nuevos registros.

### 7. Superviviente y Herencia de Equipo en Copas Knockout

| Detalle | Descripción |
|---------|-------------|
| **Competiciones aplicables** | 7 copas KO: Champions, Europa League, Conference League, Copa Italia, FA Cup, Copa del Rey y DFB-Pokal |
| **Suscripción automática** | Al elegir equipo en el landing, el usuario queda suscrito a todas las copas KO donde su club compite (225 equipos reales en `teamCups`) |
| **Estado independiente** | Registro por copa en `tournament_survivors` con estado `ALIVE` 🟢 o `ELIMINATED` 🔴 |
| **Eliminación directa** | Si el equipo activo pierde en una ronda KO (incluyendo penales), queda eliminado de esa copa |
| **Herencia de camiseta 👑** | Si pronostica la victoria del rival y acierta, hereda la camiseta del rival (`active_team_id`) para las siguientes fases |
| **Aislamiento** | El club favorito principal (`profiles.team_id`) permanece **100% fijo** y jamás es modificado por eventos en copas |

**Visualización:**
- `CompetitionStatusCard.tsx` en el landing muestra el estado VIVO/KO y equipo activo por cada copa.
- `/pronosticar` muestra el badge de club representante y deshabilita pronósticos si fue eliminado.
- `/mis-pronosticos` detalla el resumen de estado con la ronda real y la línea de tiempo de camisetas heredadas.

---

## 🤖 Automatización 100% (Resultados → Puntos → Survivors → Ranking)

### Cron cada 2 horas (`.github/workflows/auto-evaluate-matches.yml`)

1. **Sincroniza ESPN** con backfill de 3 días usando rango `dates=YYYYMMDD-YYYYMMDD` (ESPN rechaza listas separadas por coma con HTTP 400).
2. **Actualiza `officialEvaluatedMatches.json`** con resultados y goleadores reales (IDs canónicos determinísticos).
3. **Evalúa todos los pronósticos** (JSON local + Supabase) aplicando las reglas oficiales de puntuación.
4. **Persiste en Supabase** con la service role key (REST directo, bypass RLS):
   - Resultados en `matches` (solo filas sin resultado).
   - Puntos en `predictions`.
   - Progresión de supervivencia en `tournament_survivors` (emparejamientos KO oficiales, idempotente).
   - Calendario en `matches` solo cuando cambia `officialFixtures.json` (hash md5 en `app_meta`).
5. **Fail-fast:** Si todas las ligas fallan, el run de Actions queda marcado como fallido (no falla en silencio).
6. **Commit automático:** Si los JSON de evaluados cambiaron, el bot hace commit y push a `main`.

### Cliente en vivo

- `/ranking` y `/mis-pronosticos` recalculan puntos en el navegador con resultados ESPN en vivo (caché 30s) + fallback a los JSON oficiales.
- El survivor también progresa client-side al abrir `/mis-pronosticos` (refuerzo idempotente).

---

## 🗄️ Base de Datos

### Tablas (Supabase PostgreSQL)

| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `teams` | Clubes oficiales 2026/27 (225 equipos) | Lectura pública |
| `profiles` | Perfiles de participantes y equipo favorito | Lectura pública / Escritura propio usuario |
| `players` | Plantillas de jugadores oficiales | Lectura pública |
| `matches` | Partidos oficiales (1.650 filas con IDs canónicos) | Lectura pública |
| `predictions` | Pronósticos de marcadores por participante | Lectura pública / Escritura propio usuario |
| `prediction_scorers` | Goleadores pronosticados por partido | Lectura pública / Escritura con IDOR fix |
| `tournament_survivors` | Supervivencia y herencia en 7 copas KO | Lectura pública / Escritura propio usuario |
| `app_meta` | Clave-valor (hash del calendario para el cron) | Solo service role |

Los IDs de los partidos son **UUIDs determinísticos** generados por `matchIdToUuid()` — no se almacenan en la API original. Cualquier identificador (numérico de football-data.org, string de ESPN, o UUID existente) se convierte a un UUID v4 determinístico using hash, garantizando consistencia entre el JSON local, Supabase y el cron.

El esquema DDL completo, diagrama ER, triggers y políticas RLS se encuentran en [`supabase/schema.sql`](./supabase/schema.sql). Para restauración total, ver el [Manual de Disaster Recovery](./DISASTER_RECOVERY_AND_SCHEMA.md).

---

## 🔒 Seguridad y RLS

Todas las tablas usan **Row Level Security**: lectura pública para ranking/cron, escritura solo del dueño. El cron escribe con la **service role key** vía REST directo (bypass RLS) — no existen RPCs públicos de escritura.

| Política | Detalle |
|----------|---------|
| `prediction_scorers` | Escritura validada por ownership del pronóstico con `EXISTS` sobre `predictions` (IDOR fix) |
| `app_meta` | Sin grants para anon/authenticated — solo service role |
| `delete_user_account` | RPC `SECURITY DEFINER` (solo `authenticated`) que purga en cascada y libera el email |
| **Contraseñas** | Mínimo 8 caracteres + mayúscula + número + símbolo |

> **No commitear** `SUPABASE_SERVICE_ROLE_KEY` ni `.env.local` (están en `.gitignore`). Ver [DISASTER_RECOVERY_AND_SCHEMA.md](./DISASTER_RECOVERY_AND_SCHEMA.md) para la configuración completa de RLS.

---

## 🔐 Variables de Entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ilkndkqcmxvlufxaugog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_FOOTBALL_DATA_KEY=733c2feed2bf441292e9779c91af2e09
SUPABASE_SERVICE_ROLE_KEY=tu-service-key   # SOLO local y GitHub Secrets (nunca en el bundle)
```

### GitHub Secrets necesarios (para CI/CD y cron)

| Secret | Uso |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (build estático) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (build estático) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key para el cron (escritura bypass RLS) |

---

## 💻 Desarrollo Local

### Prerrequisitos

- Node.js 22+
- npm

### Comandos

```bash
# Instalar dependencias
npm ci

# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Compilar build estático de producción (genera carpeta /out)
npm run build

# Ejecutar análisis de linter ESLint
npm run lint

# Type-checking
npx tsc --noEmit
```

### Verificaciones de Lógica y Calendario

```bash
node scripts/verify-logic.js            # 43 checks de lógica de negocio
node scripts/validate-fixtures.js       # Validación cruzada del calendario contra fuentes reales
node scripts/test-survivor.js           # Tests del sistema de superviviente (12/12)
```

### Cron Local

```bash
SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/auto-sync-espn-results.js
```

---

## 🚀 Despliegue en Producción

El despliegue es completamente automático vía **GitHub Actions** al hacer push a la rama `main`.

### Flujo de deploy (`.github/workflows/deploy.yml`)

1. **Checkout** del código.
2. **Setup Node.js 22** con caché npm.
3. **`npm ci`** — Instalación reproducible.
4. **`npm run build`** — Genera archivos estáticos en `./out/`.
5. **Upload artifact** y **deploy a GitHub Pages**.

### Configuración

- **Dominio personalizado:** `futbolcamisetapasion.com` (Cloudflare DNS → GitHub Pages)
- **Sin basePath** — dominio propio, no necesita prefijo.
- **`public/.nojekyll`** — Evita que GitHub Pages ignore `_next/`.
- **`next.config.ts`:** `output: "export"`, `images: { unoptimized: true }`, `trailingSlash: true`.

---

## 📱 PWA (Progressive Web App)

- **Manifest:** `public/manifest.json` — nombre, icono, color de tema (`#c9a84c`), orientación portrait.
- **Service Worker:** `public/sw.js` — network-first con fallback a caché offline.
- **Icono:** `public/icon.svg` — SVG escalable.
- **Registro:** `src/app/RegisterSW.tsx` — se monta en el layout raíz.
- **Meta tags:** `apple-mobile-web-app-capable`, `theme-color`, viewport sin zoom.
- **Instalación en Android (Chrome):** ícono "⋮" → "Instalar app".
- **Instalación en iOS (Safari):** ícono compartir □↑ → "Agregar a pantalla de inicio".

---

## 📘 Recuperación ante Desastres

El repositorio incluye el script maestro DDL y semilla SQL en [`supabase/schema.sql`](./supabase/schema.sql) y el manual completo de recuperación:

👉 **[Consulte el Manual de Restauración Total (DISASTER_RECOVERY_AND_SCHEMA.md)](./DISASTER_RECOVERY_AND_SCHEMA.md)**

### Guía Rápida (5 minutos)

1. **Crear proyecto en Supabase** → ir a SQL Editor → pegar y ejecutar `supabase/schema.sql`.
2. **Configurar `.env.local`** con la URL y anon key del nuevo proyecto.
3. **Sincronizar datos reales:**
   ```bash
   node scripts/sync-official-fixtures.js   # Regenera officialFixtures.json
   node scripts/sync-db.js                  # Puebla matches y teams en Supabase
   node scripts/validate-fixtures.js        # Verifica 0 errores
   ```
4. **Actualizar GitHub Secrets** y hacer push a `main`.

---

## 🔧 Troubleshooting

### Auth caído (nadie puede loguearse)

**Síntoma:** Endpoints `/auth/v1/*` sin responder pero `/rest/v1/*` funciona y el proyecto figura `ACTIVE_HEALTHY`.

**Solución:** Reiniciar el proyecto con la Management API:
```bash
curl -X POST "https://api.supabase.com/v1/projects/ilkndkqcmxvlufxaugog/restart" \
  -H "Authorization: Bearer <MANAGEMENT_API_TOKEN>"
```
Verificar con `GET /auth/v1/health` (debe devolver 200 con `"version":"v2.x"`).

### Resultados no sincronizados

**Causa conocida (ago-2026):** ESPN cambió su API y rechaza listas de fechas separadas por coma (`?dates=20260831,20260830,...` → HTTP 400). Solo acepta fecha única o rango con guión (`?dates=YYYYMMDD-YYYYMMDD`).

**Diagnóstico:**
```bash
gh run list --workflow=auto-evaluate-matches.yml
# Revisar log de "Sync finished match results from ESPN"
```

**Verificación manual:**
```bash
curl "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260828-20260831"
```

### Verificación rápida de salud del proyecto

```bash
node scripts/verify-logic.js              # 43 checks
node scripts/validate-fixtures.js         # 0 errores
node scripts/test-survivor.js             # 12/12 PASS
npx tsc --noEmit                          # Type-checking
npm run build                             # Build completo
```

### Rebotes de email de Supabase

Las cuentas sin confirmar (`confirmed_at IS NULL` en `auth.users`) generan rebotes. Diagnosticar:
```sql
SELECT email, created_at FROM auth.users WHERE confirmed_at IS NULL;
```
Eliminar cuentas de testing/obsoletas. **No registrar emails inventados.**

---

## 📄 Licencia

Proyecto privado — 4° Concurso Interliga 2026–27.
