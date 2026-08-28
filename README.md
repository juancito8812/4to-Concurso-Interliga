# 4° Concurso Interliga

Plataforma oficial de pronósticos de fútbol para la temporada 2026-27. Los participantes eligen su club favorito y compiten pronosticando resultados, marcadores exactos y goleadores en las principales ligas y copas europeas (Premier League, LaLiga, Serie A, Bundesliga, Champions League, Europa League, Conference League y Copa Italia).

---

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Static Site Generation con exportación estática `output: "export"`).
- **Frontend & UI:** React 19, Tailwind CSS v4, DM Sans Typography.
- **Lenguaje:** TypeScript 5 en modo estricto.
- **Base de Datos & Auth:** [Supabase](https://supabase.com/) (Autenticación + PostgreSQL con Row Level Security y RPCs seguras).
- **APIs de Fútbol y Datos Oficiales:**
  - `football-data.org` API (calendario y plantillas oficiales en vivo de la temporada 2026/27).
  - `src/data/officialFixtures.json` (1.406 partidos oficiales 2026/27 pre-sincronizados como fallback offline/CORS).
  - `src/data/officialPlayers.json` (3.031 jugadores oficiales 2026/27 de 95 clubes clasificados por posición).
  - ESPN API (tablas de clasificación y posiciones en vivo).
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
│   │       └── TablaLigaClient.tsx # Clasificación de liga en vivo (ESPN API)
│   ├── registro/page.tsx           # Registro con nombre de usuario obligatorio
│   ├── login/page.tsx              # Inicio de sesión
│   ├── olvide-contrasena/page.tsx  # Recuperación de clave por correo
│   ├── perfil/page.tsx             # Edición de perfil, reinicio de datos y eliminación de cuenta
│   ├── pronosticar/page.tsx        # Pronósticos estilo transmisión TV con ventana de 3 partidos
│   ├── mis-pronosticos/page.tsx    # Historial de predicciones, estado y desglose de puntos
│   └── ranking/page.tsx            # Ranking general en vivo, Podio de Honor y búsqueda
├── data/
│   ├── officialFixtures.json       # Calendario oficial 2026/27 (1.406 partidos)
│   └── officialPlayers.json        # Plantillas oficiales 2026/27 (3.031 jugadores)
├── lib/
│   ├── supabase.ts                 # Cliente Supabase
│   ├── leagueConfig.ts             # Normalizador canónico de ligas, torneos y equipos
│   ├── footballData.ts             # Cliente football-data.org + plantillas 2026/27
│   ├── espnApi.ts                  # Cliente ESPN API para tablas de posiciones
│   └── scoring.ts                  # Motor de cálculo y auditoría de puntuación
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

### 3. Regla de Cierre de 10 Minutos y Re-edición
- Cada encuentro se bloquea para edición **10 minutos antes de su pitazo inicial** (`diffMin <= 10`).
- Mientras falten más de 10 minutos, los pronósticos pueden modificarse y guardarse tantas veces como se desee.

### 4. Goleadores en Doble Columna Simétrica
- Panel integrado debajo de cada club con dropdown clasificado por posición (Delanteros y Centrocampistas primero) y selector de goles `⚽ [-] 1 [+]`.

### 5. Ranking General en Vivo Multiusuario
- Sincronización en tiempo real de todos los usuarios registrados en Supabase con sus respectivos clubes y puntuaciones.
- Podio de Honor con medallas de Oro 🥇, Plata 🥈 y Bronce 🥉, coronas de líder y búsqueda instantánea.

### 6. Gestión de Cuenta y Privacidad
- **Reinicio de Participación:** Permite reiniciar pronósticos a 0 puntos y elegir otro club.
- **Eliminación Total de Cuenta (`delete_user_account`):** Borra permanentemente los datos en Supabase y **libera el correo electrónico** para nuevos registros.

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
```

---

## 🚀 Despliegue en Producción

El despliegue es completamente automático vía **GitHub Actions** al hacer push a la rama `main`.
Consulte el flujo de trabajo en `.github/workflows/deploy.yml`.

- **Sitio Web Oficial:** https://juancito8812.github.io/4to-Concurso-Interliga/

