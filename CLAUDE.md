# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol con autenticación, tablas de posiciones por liga, sistema de ranking en vivo y gestión de perfiles para la temporada 2026/27.

## Stack clave

- Next.js 16 + App Router + static export (`output: "export"`)
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto
- Supabase (Auth + PostgreSQL con RLS público y RPC `delete_user_account`)
- `src/data/officialFixtures.json` — 1.842 partidos oficiales 2026/27 para las 8 competiciones
- `src/data/officialPlayers.json` — Base de datos oficial de 3.822 jugadores 2026/27 clasificados por posición
- ESPN API pública para tablas de clasificación, goleadores y partidos en vivo (CORS habilitado)

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
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación, goleadores y partidos por liga (ESPN API)
- `src/data/officialFixtures.json` — 1.842 partidos oficiales 2026/27 pre-sincronizados
- `src/data/officialPlayers.json` — 3.822 jugadores 2026/27 con posiciones y roles actualizados
- `src/lib/supabase.ts` — Cliente Supabase
- `src/lib/survivor.ts` — Módulo de supervivencia multitorneo KO, evaluación de partidos (`evaluateSurvivorProgression`) y herencia de camisetas
- `src/lib/leagueConfig.ts` — Colores, logos, normalizadores `normalizeMatchLeague` y `normalizeTeamName`
- `src/lib/scoring.ts` — Motor de cálculo de puntos
- `src/contexts/AuthContext.tsx` — Context de autenticación, sync de perfiles y `deleteAccount`
- `supabase/schema.sql` — Script DDL maestro con las 7 tablas, 15 índices, RLS, triggers y 89 equipos oficiales
- `DISASTER_RECOVERY_AND_SCHEMA.md` — Manual de restauración paso a paso ante pérdida total
- `next.config.ts` — basePath para GitHub Pages

## Autenticación y Base de Datos

- Registro con nombre de usuario, login y recuperación de contraseña vía Supabase Auth.
- Perfil extendido en tabla `profiles` (`user_id`, `display_name`, `team_id`).
- Trigger `handle_new_user` en Supabase crea automáticamente el perfil en el registro.
- Políticas RLS habilitan lectura pública para `profiles`, `predictions`, `prediction_scorers` y `tournament_survivors`.
- Tabla `tournament_survivors` (`user_id`, `tournament_slug`, `active_team_id`, `status`, `eliminated_at_round`, `history`) para el seguimiento independiente por copa.
- RPC `delete_user_account` elimina cuenta, purga datos y libera el correo en `auth.users`.
- Rutas protegidas: `/perfil`, `/pronosticar`, `/mis-pronosticos`.

## Funcionalidades y Reglas de Pronósticos

- **Ventana Rodante:** Visualización exacta de los 3 siguientes partidos oficiales del equipo; al finalizar uno, entra el siguiente del fixture.
- **Cierre y Re-edición:** Cierre a los **10 minutos antes del partido** (`diffMin <= 10`). Re-edición permitida libremente antes del cierre (`diffMin > 10`).
- **Diseño Transmisión TV:** Cabecera con logo de competencia, marcador con badges y cuenta regresiva dinámica.
- **Goleadores Simétricos:** 2 columnas bajo cada club con dropdown clasificado por posición y stepper de goles `⚽ [-] 1 [+]`.
- **Ranking Multiusuario:** Podio de Honor dinámico (Oro 🥇, Plata 🥈, Bronce 🥉) con escudos oficiales, puntos reales y filtros.
- **Superviviente en Copas Knockout (Champions, Europa, Conference, Copa Italia):** Estado independiente por copa (`ALIVE` / `ELIMINATED`). Si el participante pronostica la victoria del rival y acierta, hereda la camiseta del rival para las siguientes fases (`history` JSONB), mientras su club base en liga regular permanece 100% fijo.

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
npm run lint     # Verificar ESLint
```
