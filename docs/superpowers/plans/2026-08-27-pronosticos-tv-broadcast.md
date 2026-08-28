# Implementación de Pronósticos Estilo Transmisión Oficial de TV

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pantalla `/pronosticar` con estética de transmisión oficial de TV (UEFA/Premier/LaLiga), mostrando los 3 próximos partidos del equipo, cierre a los 10 minutos, re-edición libre antes del cierre, y selección de goleadores dividida en 2 columnas directamente bajo cada equipo.

**Architecture:** Actualización del componente de cliente `PronosticarPage` en `src/app/pronosticar/page.tsx` para sincronizar con Supabase (`predictions`, `prediction_scorers`, `matches`, `teams`, `players`), aplicando la regla de bloqueo de 10 minutos (`diffMin <= 10`), cálculo de tiempo restante y estructura simétrica en 2 columnas con Tailwind CSS v4.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase Client, football-data.org API + fixtures oficiales 2026/27.

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

- [x] **Step 1: Modificar la función `isMatchLocked` y agregar cálculo de tiempo restante**
  - `isMatchLocked`: Retorna `true` únicamente si `diffMin <= 10`.
  - `getTimeRemaining(matchDate)`: Retorna badges formateados (`Cerrado`, `Cierra en X min`, `Cierra en X h`, `En X d`).

- [x] **Step 2: Ajustar la carga de partidos para garantizar los 3 próximos partidos**
  - Carga los 3 próximos partidos del equipo ordenados cronológicamente.

- [x] **Step 3: Verificar compilación con `npm run build`**
  - Build exitoso sin errores.

- [x] **Step 4: Commit**
  - Completado.

---

### Task 2: Rediseñar la tarjeta con estética de transmisión TV y visualización de competencia

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: `leagueConfig.ts` (`leagueColors`, `leagueLogos`, `normalizeMatchLeague`), `teamLogos`
- Produces: Broadcast header, TV scoreboard center, status badge con cuenta regresiva.

- [x] **Step 1: Implementar cabecera de transmisión de liga**
  - Barra superior con gradiente de color de la competición, logo oficial, nombre de liga y badge de cuenta regresiva.

- [x] **Step 2: Diseñar el marcador central estilo transmisión de TV**
  - Lado izquierdo: Escudo circular del Local + Nombre del equipo.
  - Centro: Inputs de marcador digital estilo broadcast con pill `VS`.
  - Lado derecho: Nombre del equipo Visitante + Escudo circular.

- [x] **Step 3: Verificar compilación con `npm run build`**
  - Build exitoso sin errores.

- [x] **Step 4: Commit**
  - Completado.

---

### Task 3: Implementar panel de goleadores en 2 columnas bajo cada equipo

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: `getPlayersForTeam(teamName)`, `updateScorer`, `removeScorer`, `addScorer`
- Produces: Panel de goleadores locales bajo equipo local (izquierda) y visitantes bajo equipo visitante (derecha).

- [x] **Step 1: Estructurar columnas simétricas para goleadores**
  - Columna Local (izquierda) con lista de goleadores locales y botón `+ Agregar goleador local`.
  - Columna Visitante (derecha) con lista de goleadores visitantes y botón `+ Agregar goleador visitante`.

- [x] **Step 2: Ajustar lógica de sincronización y botón de Guardar / Actualizar**
  - Botón dinámico `"Guardar Pronósticos"` / `"Actualizar Pronósticos"`.

- [x] **Step 3: Verificar compilación con `npm run build`**
  - Build exitoso sin errores.

- [x] **Step 4: Commit**
  - Completado.

---

### Task 4: Verificación integral y pruebas

**Files:**
- Test & Verify: `src/app/pronosticar/page.tsx`, `src/lib/footballData.ts`, `src/lib/leagueConfig.ts`

- [x] **Step 1: Ejecutar verificación de build y tipos**
  - `npm run build` completado exitosamente con 0 errores.

- [x] **Step 2: Commit final y actualización de documentación**
  - Documentación en `AGENTS.md`, `CLAUDE.md`, `README.md` y `DESIGN.md` completamente actualizada y sincronizada.
