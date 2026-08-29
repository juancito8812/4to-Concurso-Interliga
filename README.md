# 4° Concurso Interliga

Plataforma oficial de pronósticos de fútbol para la temporada 2026-27. Los participantes eligen su club favorito y compiten pronosticando resultados, marcadores exactos y goleadores en las principales ligas y copas europeas (Premier League, LaLiga, Serie A, Bundesliga, Champions League, Europa League, Conference League y Copa Italia).

---

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Static Site Generation con exportación estática `output: "export"`).
- **Frontend & UI:** React 19, Tailwind CSS v4, DM Sans Typography.
- **Lenguaje:** TypeScript 5 en modo estricto.
- **Base de Datos & Auth:** [Supabase](https://supabase.com/) (Autenticación + PostgreSQL con Row Level Security y RPCs seguras).
- **APIs de Fútbol y Datos Oficiales:**
  - `src/data/officialFixtures.json` (**1.842 partidos oficiales** de la temporada 2026/27 pre-sincronizados para las 8 competiciones).
  - `src/data/officialPlayers.json` (**3.822 jugadores oficiales** de la temporada 2026/27 de todos los clubes participantes clasificados por posición).
  - ESPN API pública (tablas de clasificación, máximos goleadores y resultados en vivo sin restricciones de CORS).
- **Deploy:** GitHub Pages (`basePath: "/4to-Concurso-Interliga"`).

---

## 📂 Estructura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    # Landing principal con Podio de Premios y Reglas
│   ├── layout.tsx                  # Layout raíz con tema oscuro navy + gold y metadatos
│   ├── globals.css                 # Variables de diseño y paleta de colores Tailwind v4
│   ├── providers.tsx               # AuthProvider context wrapper
│   ├── Navbar.tsx                  # Barra de navegación con nombre de usuario y dropdown
│   ├── Footer.tsx                  # Pie de página con accesos directos y créditos
│   ├── TeamSelectorCard.tsx        # Selección y bloqueo de club del participante
│   ├── CompetitionStatusCard.tsx   # Estado de la competición (En Vivo / KO)
│   ├── tabla/
│   │   └── [league]/
│   │       ├── page.tsx            # Generador de rutas estáticas (SSG)
│   │       └── TablaLigaClient.tsx # Clasificación, goleadores y calendario de partidos (ESPN API)
│   ├── registro/page.tsx           # Registro con nombre de usuario obligatorio
│   ├── login/page.tsx              # Inicio de sesión
│   ├── olvide-contrasena/page.tsx  # Recuperación de clave por correo
│   ├── actualizar-contrasena/page.tsx # Destino del email de recuperación (nueva clave)
│   ├── perfil/page.tsx             # Edición de perfil, reinicio de datos y eliminación de cuenta
│   ├── pronosticar/page.tsx        # Pronósticos estilo transmisión TV con ventana de 3 partidos
│   ├── mis-pronosticos/page.tsx    # Historial de predicciones, estado y desglose de puntos
│   └── ranking/page.tsx            # Ranking general en vivo, Podio de Honor y búsqueda
├── data/
│   ├── officialFixtures.json       # Calendario oficial 2026/27 (1.842 partidos, IDs canónicos únicos)
│   ├── teamAliases.json            # Fuente única de normalización (aliasMap, equipos canónicos, pares KO)
│   ├── officialPlayers.json        # Plantillas oficiales 2026/27 (3.822 jugadores)
│   ├── officialEvaluatedMatches.json # Resultados oficiales finalizados y goleadores reales
│   └── officialEvaluatedPredictions.json # Pronósticos evaluados y sincronizados
├── lib/
│   ├── supabase.ts                 # Cliente Supabase
│   ├── survivor.ts                 # Motor de supervivencia y herencia de camisetas en copas KO
│   ├── leagueConfig.ts             # Normalizador canónico de ligas, torneos y equipos (matchIdToUuid, isKnockoutMatch)
│   ├── footballData.ts             # Cliente football-data.org + plantillas oficiales 2026/27
│   ├── espnApi.ts                  # Cliente ESPN API para tablas de posiciones, goleadores y partidos
│   ├── espnResultsFetcher.ts       # Partidos finalizados ESPN en vivo para el cliente (caché 30s)
│   └── scoring.ts                  # Motor de cálculo y auditoría de puntuación (+ matching fonético)
├── scripts/
│   ├── auto-sync-espn-results.js   # Cron: ESPN → evaluación de puntos/survivors → Supabase (service key)
│   ├── evaluate-matches.js         # Evaluador CLI de partidos concluidos y cálculo de puntos
│   ├── assign-points.js            # Asignación y actualización directa de pronósticos y puntos
│   ├── test-survivor.js            # Suite de pruebas unitarias del sistema de superviviente
│   └── lib/score-utils.js          # Módulo compartido (normalización, ids canónicos, scoring, survivor)
└── contexts/
    └── AuthContext.tsx             # Context de autenticación, perfil y gestión de cuenta
```

---

## 🧭 Rutas de la Aplicación

| Ruta | Descripción | Requiere Auth |
|------|-------------|:-------------:|
| `/` | Landing principal, selector de equipo y podio de premios | No |
| `/registro` | Creación de cuenta con nombre de usuario | No |
| `/login` | Inicio de sesión | No |
| `/olvide-contrasena` | Solicitud de restablecimiento de contraseña | No |
| `/actualizar-contrasena` | Destino del email de recuperación (nueva contraseña) | No |
| `/perfil` | Edición de nombre de usuario, reinicio de club y eliminación de cuenta | **Sí** |
| `/pronosticar` | Envío y re-edición de pronósticos en tarjetas estilo TV | **Sí** |
| `/mis-pronosticos` | Historial de pronósticos enviados y desglose de puntos obtenidos | **Sí** |
| `/ranking` | Tabla de clasificación general en vivo y Podio de Honor | No |
| `/tabla/laliga` | Tabla de posiciones oficial de LaLiga | No |
| `/tabla/premier` | Tabla de posiciones oficial de Premier League | No |
| `/tabla/seriea` | Tabla de posiciones oficial de Serie A | No |
| `/tabla/bundesliga` | Tabla de posiciones oficial de Bundesliga | No |
| `/tabla/champions` | Tabla de posiciones oficial de UEFA Champions League | No |
| `/tabla/europa` | Tabla de posiciones oficial de UEFA Europa League | No |
| `/tabla/conference` | Tabla de posiciones oficial de UEFA Conference League | No |
| `/tabla/coppaitalia` | Tabla de posiciones oficial de Copa Italia | No |

---

## ⚡ Reglas y Mecánicas del Concurso

### 1. Sistema de Puntuación Oficial
- **+3 Puntos:** Resultado general correcto (acertar si gana local, empate o gana visitante).
- **+2 Puntos:** Marcador exacto acertado (ej. 2-1).
- **+1 Punto:** Por cada autor de gol acertado.
- **+2 Puntos:** Por acertar la cantidad exacta de goles anotados por el goleador.

### 2. Ventana Rodante de Pronósticos (Rolling 3 Matches)
- Cada participante visualiza exactamente los **3 próximos partidos oficiales** de su club elegido.
- Cuando un partido finaliza, sale de la lista y la ventana **avanza automáticamente al siguiente partido del calendario**.

### 3. Regla de Cierre de 1 Minuto y Re-edición
- Cada encuentro se bloquea para edición **1 minuto antes de su pitazo inicial** (`diffMin <= 1`).
- Mientras falte más de 1 minuto, los pronósticos pueden modificarse y guardarse tantas veces como se desee.

### 4. Goleadores en Doble Columna Simétrica
- Panel integrado debajo de cada club con dropdown clasificado por posición (Delanteros y Centrocampistas primero) y selector de goles `⚽ [-] 1 [+]`.

### 5. Ranking General en Vivo Multiusuario
- Sincronización en tiempo real de todos los usuarios registrados en Supabase con sus respectivos clubes y puntuaciones.
- Podio de Honor con medallas de Oro 🥇, Plata 🥈 y Bronce 🥉, coronas de líder y búsqueda instantánea.

### 6. Gestión de Cuenta y Privacidad
- **Reinicio de Participación:** Permite reiniciar pronósticos a 0 puntos y elegir otro club.
- **Eliminación Total de Cuenta (`delete_user_account`):** Borra permanentemente los datos en Supabase y **libera el correo electrónico** para nuevos registros.

### 7. Superviviente y Herencia de Equipo en Copas Knockout (`src/lib/survivor.ts`)
- **Competiciones Aplicables (7 Copas KO):** UEFA Champions League (`champions`), UEFA Europa League (`europa`), UEFA Conference League (`conference`), Copa Italia (`coppaitalia`), FA Cup (`facup`), Copa del Rey (`copadelrey`) y DFB-Pokal (`dfbpokal`).
- **Suscripción Automática:** Al elegir su equipo en el landing, el usuario queda suscrito automáticamente a **todas las copas knockout** en las que su club compite según el mapeo oficial de 89 equipos (`teamCups` en `teamAliases.json`).
- **Estado de Supervivencia Independiente:** Cada usuario cuenta con un registro en la tabla `tournament_survivors` por copa con estado `ALIVE` (🟢 VIVO) o `ELIMINATED` (🔴 KO).
- **Mecánica de Eliminación Directa:** Si el equipo activo del participante pierde en una ronda KO (incluyendo definición por penales), queda eliminado (`ELIMINATED`) de esa copa y se registra la ronda real (Octavos, Cuartos, Semi, Final) en `eliminated_at_round`.
- **Mecánica de Herencia de Camiseta (`👑`):** Si un participante pronostica la victoria del rival frente a su equipo activo y el rival gana/avanza, el participante permanece `ALIVE` y **hereda la camiseta del rival** (`active_team_id`) para las siguientes fases, registrando la transferencia en el historial (`history` JSONB).
- **Aislamiento de Liga Regular:** El club favorito principal del participante (`profiles.team_id`) permanece **100% fijo** y jamás es modificado por eventos o transferencias en copas.
- **Visualización:**
  - `CompetitionStatusCard.tsx` (Paso 3 en landing) muestra el estado VIVO/KO y equipo activo por cada una de las 7 copas.
  - `/pronosticar` muestra el badge de club representante activo y deshabilita pronósticos si el usuario fue eliminado en esa copa o si su equipo no participa en ella.
  - `/mis-pronosticos` detalla el resumen de estado con la ronda real y la línea de tiempo completa de camisetas heredadas.

---

## 💻 Comandos de Desarrollo

```bash
# Iniciar servidor de desarrollo en puerto 3000
npm run dev

# Compilar build estático de producción (genera carpeta /out)
npm run build

# Ejecutar análisis de linter ESLint
npm run lint
```

---

## 🔐 Configuración de Variables de Entorno

Crear el archivo `.env.local` en la raíz con las siguientes credenciales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ilkndkqcmxvlufxaugog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_FOOTBALL_DATA_KEY=733c2feed2bf441292e9779c91af2e09
SUPABASE_SERVICE_ROLE_KEY=tu-service-key   # SOLO local y GitHub Secrets (nunca en el bundle)
```

## 🔒 Seguridad

- **RLS en todas las tablas**: lectura pública para ranking/cron; escritura solo del dueño (`prediction_scorers` validado por ownership del pronóstico — IDOR fix).
- **Sin RPCs públicos de escritura**: el cron usa la service role key vía GitHub Secrets; los intentos de manipulación con la anon key devuelven 404/401.
- **Contraseñas**: mínimo 8 caracteres + mayúscula + número + símbolo (HIBP es solo Pro).
- **Auth**: `site_url` y `uri_allow_list` configurados para GitHub Pages (confirmación de registro y recuperación de contraseña funcionando).

---

## 🗄️ Base de Datos y Recuperación ante Desastres

El repositorio incluye el **script maestro DDL y semilla SQL** en [`supabase/schema.sql`](./supabase/schema.sql) y el manual completo de recuperación:

👉 **[Consulte el Manual de Restauración Total (DISASTER_RECOVERY_AND_SCHEMA.md)](./DISASTER_RECOVERY_AND_SCHEMA.md)** para recrear el 100% de la base de datos, índices de rendimiento, triggers y políticas RLS en caso de migración o pérdida total.

---

## 🤖 Automatización 100% (Resultados → Puntos → Survivors → Ranking)

### Cron cada 2 horas (`.github/workflows/auto-evaluate-matches.yml`)

1. **Sincroniza ESPN** con backfill de 3 días (scoreboards de las 8 competiciones).
2. **Actualiza `officialEvaluatedMatches.json`** con resultados y goleadores reales (IDs canónicos determinísticos).
3. **Evalúa todos los pronósticos** (JSON + Supabase) aplicando las reglas oficiales de puntuación.
4. **Persiste en Supabase** con la service role key (REST directo, bypass RLS):
   - Resultados en `matches` (solo filas sin resultado).
   - Puntos en `predictions`.
   - Progresión de supervivencia en `tournament_survivors` (solo emparejamientos KO oficiales, idempotente).
   - Calendario en `matches` solo cuando cambia `officialFixtures.json` (hash md5 en `app_meta`).

### Cliente en vivo

- `/ranking` y `/mis-pronosticos` recalculan puntos en el navegador con resultados ESPN en vivo (caché 30s) + fallback a los JSON oficiales.
- El survivor también progresa client-side al abrir `/mis-pronosticos` (refuerzo idempotente).

---

## 🚀 Despliegue en Producción

El despliegue es completamente automático vía **GitHub Actions** al hacer push a la rama `main`.
Consulte el flujo de trabajo en `.github/workflows/deploy.yml`.

- **Sitio Web Oficial:** https://juancito8812.github.io/4to-Concurso-Interliga/

