# Memoria del Proyecto: 4to-Concurso-Interliga

## Información General

- **Propósito:** Aplicación web para el 4° Concurso de pronósticos de fútbol (temporada 2026-27). Permite elegir equipo, pronosticar resultados y goleadores de 8 ligas/copas europeas, ver clasificaciones y competir en el ranking general.
- **Stack:** Next.js 16.3.2 (App Router, static export), React 19, Tailwind CSS v4, TypeScript 5, Supabase (Auth + PostgreSQL), ESPN Public API.
- **Deploy:** GitHub Pages (`basePath: "/4to-Concurso-Interliga"`, workflow `.github/workflows/deploy.yml`).
- **Última sesión:** 2026-08-26 23:04
- **Versión de memoria:** 1.0

## Arquitectura

- `src/app/` — Páginas de Next.js (`/`, `/registro`, `/login`, `/olvide-contrasena`, `/perfil`, `/pronosticar`, `/mis-pronosticos`, `/ranking`, `/tabla/[league]`).
- `src/lib/espnApi.ts` — API client para estadísticas en vivo, clasificaciones y fixtures de las 8 competiciones sin restricciones de CORS ni límites de API key.
- `src/lib/scoring.ts` — Motor oficial de cálculo de puntuación (`calculateScore`) para aciertos de signo, marcador exacto, diferencia de 1 gol y goleadores.
- `src/lib/supabase.ts` — Cliente Supabase para profiles, teams, players, matches, predictions y prediction_scorers.
- `src/lib/leagueConfig.ts` — Colores de marca y logos locales de las 8 ligas.

## Decisiones Clave

- **2026-08-26** — **Migración a ESPN API pública en `src/lib/espnApi.ts`**: Resuelve el problema de CORS en GitHub Pages que tenía `football-data.org` (que devolvía `Access-Control-Allow-Origin: http://localhost`) y da soporte completo a Europa League, Conference League y Copa Italia.
- **2026-08-26** — **Motor de scoring en `src/lib/scoring.ts`**: Implementa las 5 reglas de puntuación con normalización de nombres de jugadores (tildes/mayúsculas) para calcular puntos tanto en `/mis-pronosticos` como en `/ranking`.
- **2026-08-26** — **Consultas desacopladas en Supabase (`src/app/ranking/page.tsx`)**: Se reemplazó la consulta unida `select("..., profiles(display_name)")` (que fallaba con `PGRST200`) por consultas independientes coordinadas por `user_id`.

## Estado Actual

- **Branch:** `main` (sincronizada con `origin/main`).
- **Build Status:** `npm run build` y `npm run lint` pasando con 0 errores (19 rutas estáticas generadas).
- **Deploy:** Despliegue automatizado en GitHub Pages.

## Cambios Recientes

- **2026-08-26**:
  - Optimización UI/UX, responsive móvil, accesibilidad en badges y menú desplegable del Navbar.
  - Corrección tipográfica en `globals.css` para enlazar Google Font DM Sans.
  - Implementación de `src/lib/espnApi.ts` y soporte para las 8 competiciones en `TablaLigaClient.tsx`.
  - Actualización del texto de la Tarjeta #2 de reglas de competición en la Landing.
  - Creación del motor de puntuación en `src/lib/scoring.ts` con tests unitarios (7/7 pasados).
  - Sincronización en vivo del Ranking general (`/ranking`) con cálculo de puntos, escudos de equipo y plenos acertados.

## Próximos Pasos / Ideas Futuras

- [ ] Cargar usuarios y resultados reales a medida que avance el calendario deportivo.
- [ ] Opcional: Agregar selector de jornadas pasadas en las tablas de ligas.
