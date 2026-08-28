# Memoria del Proyecto: 4to-Concurso-Interliga

## Información General

- **Propósito:** Aplicación web para el 4° Concurso de pronósticos de fútbol (temporada 2026-27). Permite elegir equipo, pronosticar resultados y goleadores de 8 ligas/copas europeas, ver clasificaciones y competir en el ranking general.
- **Stack:** Next.js 16.3.2 (App Router, static export), React 19, Tailwind CSS v4, TypeScript 5, Supabase (Auth + PostgreSQL), ESPN Public API.
- **Deploy:** GitHub Pages (`basePath: "/4to-Concurso-Interliga"`, workflow `.github/workflows/deploy.yml`).
- **Última sesión:** 2026-08-28 12:55
- **Versión de memoria:** 1.2

## Arquitectura

- `src/app/` — Páginas de Next.js (`/`, `/registro`, `/login`, `/olvide-contrasena`, `/perfil`, `/pronosticar`, `/mis-pronosticos`, `/ranking`, `/tabla/[league]`).
- `src/lib/espnApi.ts` — API client para estadísticas en vivo, clasificaciones y fixtures de las 8 competiciones sin restricciones de CORS ni límites de API key.
- `src/lib/scoring.ts` — Motor oficial de cálculo de puntuación (`calculateScore`) para aciertos de signo, marcador exacto, diferencia de 1 gol y goleadores.
- `src/lib/supabase.ts` — Cliente Supabase para profiles, teams, players, matches, predictions y prediction_scorers.
- `src/lib/leagueConfig.ts` — Colores de marca, normalizador unificado de nombres de equipos (`normalizeTeamName`) y logos de las 8 ligas.

## Decisiones Clave

- **2026-08-28** — **Sincronización exacta con calendario en vivo (1.842 partidos y 3.822 jugadores 2026/27)**: Se integró y validó el calendario oficial en vivo alineado con la jornada activa de la temporada 2026/27 (*Bayern Munich vs Stuttgart* hoy viernes a las 18:30 UTC / 20:30 CEST en Bundesliga, *Crystal Palace vs Manchester City* en Premier League, *AC Milan vs Venezia* en Serie A, *Alavés vs Betis* en LaLiga) en `src/data/officialFixtures.json`.
- **2026-08-28** — **Pestaña "Partidos" en todas las ligas (`TablaLigaClient.tsx`)**: Se habilitó la pestaña de calendario/partidos no solo para copas sino para las 8 competiciones con resolución en vivo de ESPN y fallback al bundle oficial.
- **2026-08-26** — **Migración a ESPN API pública en `src/lib/espnApi.ts`**: Resuelve el problema de CORS en GitHub Pages que tenía `football-data.org` (que devolvía `Access-Control-Allow-Origin: http://localhost`) y da soporte completo a Europa League, Conference League y Copa Italia.
- **2026-08-26** — **Motor de scoring en `src/lib/scoring.ts`**: Implementa las 5 reglas de puntuación con normalización de nombres de jugadores (tildes/mayúsculas) para calcular puntos tanto en `/mis-pronosticos` como en `/ranking`.
- **2026-08-26** — **Consultas desacopladas en Supabase (`src/app/ranking/page.tsx`)**: Se reemplazó la consulta unida `select("..., profiles(display_name)")` (que fallaba con `PGRST200`) por consultas independientes coordinadas por `user_id`.

## Estado Actual

- **Branch:** `main`.
- **Build Status:** `npm run build` y `npm run lint` pasando con 0 errores (19 rutas estáticas generadas).
- **Deploy:** Despliegue automatizado en GitHub Pages.

## Cambios Recientes

- **2026-08-28**:
  - Sincronización del partido inaugural de hoy viernes de la Bundesliga (*Bayern Munich vs Stuttgart*, 18:30 UTC / 20:30 CEST) y jornadas oficiales de las 8 competiciones en `src/data/officialFixtures.json` (1.842 partidos oficiales).
  - Carga y normalización de 3.822 jugadores oficiales 2026/27 en `src/data/officialPlayers.json` (100% de los clubes con nómina completa de delanteros, medios, defensas y arqueros).
  - Normalizador universal de equipos en `src/lib/leagueConfig.ts` con cobertura del 100% de aliases (`FC Bayern München`, `Bayer 04 Leverkusen`, `Köln`, `Wolves`, `PSG`, etc.).
  - Actualización de `src/lib/footballData.ts` para resolver siempre los próximos partidos reales oficiales de la temporada activa.
  - Pestaña "Partidos" añadida a las 8 ligas en `src/app/tabla/[league]/TablaLigaClient.tsx`.
  - Corrección del warning de React `set-state-in-effect` en `TeamSelectorCard.tsx`.
  - Corrección de etiquetas de ligas cruzadas en la base de datos Supabase `matches`.

## Próximos Pasos / Ideas Futuras

- [ ] Cargar usuarios y resultados reales a medida que avance el calendario deportivo.
- [ ] Opcional: Agregar selector de jornadas pasadas en las tablas de ligas.
