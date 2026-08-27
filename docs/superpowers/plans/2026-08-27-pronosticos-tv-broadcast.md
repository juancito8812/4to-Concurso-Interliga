# Implementación de Pronósticos Estilo Transmisión Oficial de TV

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pantalla `/pronosticar` con estética de transmisión oficial de TV (UEFA/Premier/LaLiga), mostrando los 3 próximos partidos del equipo, cierre a los 10 minutos, re-edición libre antes del cierre, y selección de goleadores dividida en 2 columnas directamente bajo cada equipo.

**Architecture:** Actualización del componente de cliente `PronosticarPage` en `src/app/pronosticar/page.tsx` para sincronizar con Supabase (`predictions`, `prediction_scorers`, `matches`, `teams`, `players`), aplicando la regla de bloqueo de 10 minutos (`diffMin <= 10`), cálculo de tiempo restante y estructura simétrica en 2 columnas con Tailwind CSS v4.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase Client.

## Global Constraints

- Cierre de pronóstico a los 10 minutos antes del partido (`diffMin <= 10`).
- Permitir re-edición mientras falten más de 10 minutos para el inicio del partido.
- Mostrar exactamente los 3 próximos partidos del equipo del usuario.
- Cabecera con franja de color de liga, logo de la liga y nombre de la competencia.
- Panel de goleadores dividido en 2 columnas colocadas directamente debajo del equipo correspondiente (Local a la izquierda, Visitante a la derecha).
- Estética inspirada en transmisiones de TV oficiales (navy-mid, gold accents, scoreboard display).

---

### Task 1: Actualizar lógica de bloqueo de 10 minutos, re-edición y filtro de 3 partidos

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: Supabase `matches`, `teams`, `players`, `predictions`, `prediction_scorers`, `useAuth()`
- Produces: `isMatchLocked(matchDate: string): boolean`, `getTimeRemainingLabel(matchDate: string): { label: string; isUrgent: boolean }`

- [ ] **Step 1: Modificar la función `isMatchLocked` y agregar cálculo de tiempo restante**

Actualizar en `src/app/pronosticar/page.tsx`:
- `isMatchLocked`: Retornar `true` únicamente si la diferencia en minutos entre la fecha del partido y el momento actual es `<= 10`. Ya no bloquear por `prediction_id` (permitiendo re-edición).
- `getTimeRemaining(matchDate: string)`: Retornar texto formateado (ej. `"Cierra en 45 min"`, `"Cierra en 3 h"`, `"Cerrado"`, o `"En 2 días"`).

- [ ] **Step 2: Ajustar la carga de partidos para garantizar los 3 próximos partidos**

Asegurar que la consulta a Supabase y al endpoint de football-data tome los partidos cuya fecha y hora sea posterior a la actual (o con menos de 10 min de haber comenzado) y limite a 3 registros ordenados cronológicamente.

- [ ] **Step 3: Verificar compilación con `npm run build`**

Run: `npm run build`
Expected: Build exitoso sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/pronosticar/page.tsx
git commit -m "feat(pronosticos): actualizar regla de cierre a 10 min y permitir re-edicion"
```

---

### Task 2: Rediseñar la tarjeta con estética de transmisión TV y visualización de competencia

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: `leagueConfig.ts` (`leagueColors`, `leagueLogos`), `teamLogos`
- Produces: Broadcast header, TV scoreboard center, status badge con cuenta regresiva.

- [ ] **Step 1: Implementar cabecera de transmisión de liga**

En cada tarjeta de partido:
- Barra superior con color temático de la competición.
- Logo oficial de la liga (`leagueLogos[match.league]`), nombre de la competencia en tipografía destacada.
- Badge con fecha, hora local y estado dinámico (`🟢 Abierto`, `⏱️ Cierra en X min`, `🔒 Cerrado`).

- [ ] **Step 2: Diseñar el marcador central estilo transmisión de TV**

- Lado izquierdo: Escudo circular con borde dorado y fondo blanco + Nombre del equipo Local en negrita.
- Centro: Display digital para input de goles del Local, separador `: / VS`, input de goles del Visitante.
- Lado derecho: Escudo circular + Nombre del equipo Visitante.
- Diseño responsivo adaptado para pantallas móviles y desktop.

- [ ] **Step 3: Verificar compilación con `npm run build`**

Run: `npm run build`
Expected: Build exitoso sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/pronosticar/page.tsx
git commit -m "feat(ui): implementar cabecera y marcador estilo transmision de TV en pronosticos"
```

---

### Task 3: Implementar panel de goleadores en 2 columnas bajo cada equipo

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: `getPlayersForTeam(teamName)`, `updateScorer`, `removeScorer`, `addScorer`
- Produces: Panel de goleadores locales bajo equipo local (izquierda) y visitantes bajo equipo visitante (derecha).

- [ ] **Step 1: Estructurar columnas simétricas para goleadores**

Debajo del marcador:
- **Columna Local (Izquierda):**
  - Título sutil con escudo pequeño del local.
  - Lista de goleadores locales asignados: selector de jugador de la plantilla local, contador de goles `[-] N [+]`, botón eliminar `✕`.
  - Botón interactivo `+ Goleador Local` (hasta 3 goleadores).
- **Columna Visitante (Derecha):**
  - Título sutil con escudo pequeño del visitante.
  - Lista de goleadores visitantes asignados: selector de jugador de la plantilla visitante, contador de goles `[-] N [+]`, botón eliminar `✕`.
  - Botón interactivo `+ Goleador Visitante` (hasta 3 goleadores).

- [ ] **Step 2: Ajustar lógica de sincronización y botón de Guardar / Actualizar**

- El botón inferior mostrará dinámicamente:
  - `"Guardar Pronósticos"` si no existían previos.
  - `"Actualizar Pronósticos"` si ya habían sido guardados anteriormente y se modificaron.
- Mensaje de confirmación y manejo de errores.

- [ ] **Step 3: Verificar compilación con `npm run build`**

Run: `npm run build`
Expected: Build exitoso sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/pronosticar/page.tsx
git commit -m "feat(scorers): implementar seleccion de goleadores en dos columnas bajo cada equipo"
```

---

### Task 4: Verificación integral y pruebas

**Files:**
- Test & Verify: `src/app/pronosticar/page.tsx`

- [ ] **Step 1: Ejecutar verificación de build y tipos**

Run: `npm run build`
Expected: Static export completado exitosamente sin errores de compilación ni linter.

- [ ] **Step 2: Commit final y actualización de documentación**

Actualizar `AGENTS.md` y `CLAUDE.md` con la nueva regla de 10 minutos y diseño de pronósticos.
```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: actualizar reglas de pronosticos con cierre a 10 min y diseno broadcast"
```
