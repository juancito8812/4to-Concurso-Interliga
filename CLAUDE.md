# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol con autenticación, tablas de posiciones por liga, sistema de ranking en vivo y gestión de perfiles para la temporada 2026/27.

## Stack clave

- Next.js 16 + App Router + static export (`output: "export"`)
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto
- Supabase (Auth + PostgreSQL con RLS público y RPC `delete_user_account`)
- `football-data.org` API + bundle oficial de 1.406 partidos 2026/27 (`src/data/officialFixtures.json`)
- Base de datos oficial de 3.031 jugadores 2026/27 de 95 clubes (`src/data/officialPlayers.json`)
- ESPN API para tablas de clasificación en vivo

## Archivos importantes

- `src/app/page.tsx` — Landing principal con selector de equipo y podio de premios
- `src/app/globals.css` — Paleta de colores (navy + gold)
- `src/app/Navbar.tsx` — Navbar con nombre de usuario dinámico y dropdown
- `src/app/Footer.tsx` — Footer completo
- `src/app/providers.tsx` — AuthProvider wrapper
- `src/app/TeamSelectorCard.tsx` — Selección y confirmación de club
- `src/app/CompetitionStatusCard.tsx` — Estado VIVO/KO
- `src/app/registro/page.tsx` — Registro con nombre de usuario obligatorio
- `src/app/perfil/page.tsx` — Edición de nombre de usuario, reinicio de club y eliminación de cuenta
- `src/app/pronosticar/page.tsx` — Tarjetas estilo transmisión TV con ventana de 3 partidos y goleadores
- `src/app/mis-pronosticos/page.tsx` — Historial con logos y desglose de puntos
- `src/app/ranking/page.tsx` — Ranking general en vivo con Podio de Honor y búsqueda
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación por liga (ESPN API)
- `src/data/officialFixtures.json` — 1.406 partidos oficiales 2026/27 pre-sincronizados
- `src/data/officialPlayers.json` — 3.031 jugadores 2026/27 de 95 clubes con posiciones traducidas
- `src/lib/supabase.ts` — Cliente Supabase
- `src/lib/leagueConfig.ts` — Colores, logos, normalizadores `normalizeMatchLeague` y `normalizeTeamName`
- `src/lib/footballData.ts` — `getOfficialTeamMatches`, `getOfficialPlayersForTeams` con API en vivo + fallback
- `src/lib/scoring.ts` — Motor de cálculo de puntos
- `src/contexts/AuthContext.tsx` — Context de autenticación, sync de perfiles y `deleteAccount`
- `next.config.ts` — basePath para GitHub Pages

## Autenticación y Base de Datos

- Registro con nombre de usuario, login y recuperación de contraseña vía Supabase Auth.
- Perfil extendido en tabla `profiles` (`user_id`, `display_name`, `team_id`).
- Trigger `handle_new_user` en Supabase crea automáticamente el perfil en el registro.
- Políticas RLS habilitan lectura pública para `profiles`, `predictions` y `prediction_scorers`.
- RPC `delete_user_account` elimina cuenta, datos y libera el correo en `auth.users`.
- Rutas protegidas: `/perfil`, `/pronosticar`, `/mis-pronosticos`.

## Funcionalidades y Reglas de Pronósticos

- **Ventana Rodante:** Visualización exacta de los 3 siguientes partidos oficiales del equipo; al finalizar uno, entra el siguiente del fixture.
- **Cierre y Re-edición:** Cierre a los **10 minutos antes del partido** (`diffMin <= 10`). Re-edición permitida libremente antes del cierre (`diffMin > 10`).
- **Diseño Transmisión TV:** Cabecera con logo de competencia, marcador con badges y cuenta regresiva dinámica.
- **Goleadores Simétricos:** 2 columnas bajo cada club con dropdown clasificado por posición y stepper de goles `⚽ [-] 1 [+]`.
- **Ranking Multiusuario:** Podio de Honor dinámico (Oro 🥇, Plata 🥈, Bronce 🥉) con escudos oficiales, puntos reales y filtros.

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
npm run lint     # Verificar ESLint
```
