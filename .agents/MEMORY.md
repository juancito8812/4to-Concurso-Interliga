# Memoria del Proyecto: 4to-Concurso-Interliga

## Información General

- **Propósito:** Aplicación web para el 4° Concurso de pronósticos de fútbol (temporada 2026-27). Permite elegir equipo, pronosticar resultados y goleadores de 8 ligas/copas europeas, ver clasificaciones y competir en el ranking general.
- **Stack:** Next.js 16.3.2 (App Router, static export), React 19, Tailwind CSS v4, TypeScript 5, Supabase (Auth + PostgreSQL), ESPN Public API.
- **Deploy:** GitHub Pages (`basePath: "/4to-Concurso-Interliga"`, workflow `.github/workflows/deploy.yml`).
- **Última sesión:** 2026-08-28 15:25
- **Versión de memoria:** 1.4

## Arquitectura

- `src/app/` — Páginas de Next.js (`/`, `/registro`, `/login`, `/olvide-contrasena`, `/perfil`, `/pronosticar`, `/mis-pronosticos`, `/ranking`, `/tabla/[league]`).
- `src/lib/survivor.ts` — Módulo de supervivencia multitorneo KO (`evaluateSurvivorProgression`, `getUserCupSurvivors`, `setInitialCupSurvivor`, `updateCupSurvivor`).
- `src/lib/espnApi.ts` — API client para estadísticas en vivo, clasificaciones y fixtures de las 8 competiciones sin restricciones de CORS ni límites de API key.
- `src/lib/scoring.ts` — Motor oficial de cálculo de puntuación (`calculateScore`) para aciertos de signo, marcador exacto, diferencia de 1 gol y goleadores.
- `src/lib/supabase.ts` — Cliente Supabase para profiles, teams, players, matches, predictions, prediction_scorers y tournament_survivors.
- `src/lib/leagueConfig.ts` — Colores de marca, normalizador unificado de nombres de equipos (`normalizeTeamName`) y logos de las 8 ligas.
- `src/contexts/AuthContext.tsx` — Context de autenticación, perfil en vivo, traducción inteligente de errores de auth (rate limits / spam protection) y eliminación de cuenta (`deleteAccount`).

## Decisiones Clave

- **2026-08-28** — **Traducción y gestión de Rate Limits de Supabase Auth en `src/contexts/AuthContext.tsx`**: Helper `translateAuthError` que traduce mensajes técnicos de Supabase (como `over_email_send_rate_limit`) a explicaciones claras en español sobre la pausa de seguridad de 1-2 minutos antes de reintentar registros.
- **2026-08-28** — **Cierre de pronósticos ajustado a 1 minuto antes del inicio (`diffMin <= 1`)**: Se modificó `checkIsMatchLocked` y `calculateTimeRemaining` en `src/app/pronosticar/page.tsx` para permitir pronósticos y re-ediciones hasta 1 minuto antes del pitazo inicial de cada partido.
- **2026-08-28** — **Sistema de Sobreviviente y Herencia de Camisetas en Copas Knockout (`tournament_survivors`)**: Tabla dedicada en PostgreSQL con RLS y campo `history` JSONB para registrar transferencias de club al acertar victorias del rival en copas de eliminación directa.
- **2026-08-28** — **Sincronización exacta con calendario en vivo (1.842 partidos y 3.822 jugadores 2026/27)**: Se integró y validó el calendario oficial en vivo alineado con la jornada activa de la temporada 2026/27 (*Bayern Munich vs Stuttgart* hoy viernes a las 18:30 UTC / 20:30 CEST en Bundesliga, *Crystal Palace vs Manchester City* en Premier League, *AC Milan vs Venezia* en Serie A, *Alavés vs Betis* en LaLiga) en `src/data/officialFixtures.json`.
- **2026-08-28** — **Pestaña "Partidos" en todas las ligas (`TablaLigaClient.tsx`)**: Se habilitó la pestaña de calendario/partidos no solo para copas sino para las 8 competiciones con resolución en vivo de ESPN y fallback al bundle oficial.
- **2026-08-26** — **Migración a ESPN API pública en `src/lib/espnApi.ts`**: Resuelve el problema de CORS en GitHub Pages que tenía `football-data.org` (que devolvía `Access-Control-Allow-Origin: http://localhost`) y da soporte completo a Europa League, Conference League y Copa Italia.
- **2026-08-26** — **Motor de scoring en `src/lib/scoring.ts`**: Implementa las 5 reglas de puntuación con normalización de nombres de jugadores (tildes/mayúsculas) para calcular puntos tanto en `/mis-pronosticos` como en `/ranking`.
- **2026-08-26** — **Consultas desacopladas en Supabase (`src/app/ranking/page.tsx`)**: Se reemplazó la consulta unida `select("..., profiles(display_name)")` (que fallaba con `PGRST200`) por consultas independientes coordinadas por `user_id`.

- **2026-08-28** — **Diagnóstico y Herramienta de Evaluación de Partidos y Puntuación (`scripts/evaluate-matches.js`)**: Se documentó e implementó el flujo completo de evaluación de pronósticos. Se añadió banner explicativo de "Partido pendiente de juego" en `/mis-pronosticos` para partidos no finalizados (`result_home === null`), y se creó el script `scripts/evaluate-matches.js` para registrar resultados de partidos y calcular puntos con el motor `calculateScore`.

## Estado Actual

- **Branch:** `main`.
- **Build Status:** `npm run build` y `npm run lint` pasando con 0 errores (19 rutas estáticas generadas).
- **Deploy:** Despliegue automatizado en GitHub Pages.

## Cambios Recientes

- **2026-08-28**:
  - Explicación y mejora UX en `/mis-pronosticos` indicando que los puntos se calcularán al finalizar el partido.
  - Creación de `scripts/evaluate-matches.js` para evaluación y carga de marcadores reales.
  - Traducción inteligente de errores de Supabase Auth en `src/contexts/AuthContext.tsx`.
  - Reducción del tiempo de cierre de pronósticos a 1 minuto antes del partido en `src/app/pronosticar/page.tsx`.
  - Implementación completa del plan de Superviviente Knockout (Tasks 1 a 6):
    - Migración DDL y RLS de `tournament_survivors` en `supabase/schema.sql` y `DISASTER_RECOVERY_AND_SCHEMA.md`.
    - Módulo de evaluación de supervivencia pura y helpers en `src/lib/survivor.ts`.
    - Suite de pruebas unitarias en `scripts/test-survivor.js` pasando con 100% de éxito.
    - Componente interactivo multitorneo en `CompetitionStatusCard.tsx`.
    - Integración de alertas, bloqueo KO y selector inicial en `src/app/pronosticar/page.tsx`.
    - Historial de superviviente, línea de tiempo de camisetas heredadas y badges en `src/app/mis-pronosticos/page.tsx`.
    - Documentación actualizada en `README.md`, `CLAUDE.md`, `AGENTS.md`, `DISASTER_RECOVERY_AND_SCHEMA.md` y `.agents/MEMORY.md`.
  - Sincronización del partido inaugural de hoy viernes de la Bundesliga (*Bayern Munich vs Stuttgart*, 18:30 UTC / 20:30 CEST) y jornadas oficiales de las 8 competiciones en `src/data/officialFixtures.json` (1.842 partidos oficiales).
  - Carga y normalización de 3.822 jugadores oficiales 2026/27 en `src/data/officialPlayers.json` (100% de los clubes con nómina completa de delanteros, medios, defensas y arqueros).

## Próximos Pasos / Ideas Futuras

- [ ] Cargar resultados reales de partidos conforme concluyan en la vida real para otorgar puntos.
- [ ] Opcional: Agregar selector de jornadas pasadas en las tablas de ligas.

