# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — App de pronósticos de fútbol con autenticación, tablas de posiciones por liga, y sistema de ranking.

## Stack clave

- Next.js 16 + App Router + static export
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto
- Supabase (auth + PostgreSQL)

## Archivos importantes

- `src/app/page.tsx` — Landing principal
- `src/app/globals.css` — Paleta de colores (navy + gold)
- `src/app/Navbar.tsx` — Navbar con estado de auth
- `src/app/Footer.tsx` — Footer completo
- `src/app/providers.tsx` — AuthProvider wrapper
- `src/app/TeamSelectorCard.tsx` — Selección de equipo (bloqueada)
- `src/app/CompetitionStatusCard.tsx` — Estado VIVO/KO
- `src/app/pronosticar/page.tsx` — Pronósticos con goleadores
- `src/app/mis-pronosticos/page.tsx` — Historial con logos y league badges
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Clasificación por liga
- `src/lib/supabase.ts` — Cliente Supabase
- `src/lib/leagueConfig.ts` — Colores y logos de ligas (compartido)
- `src/contexts/AuthContext.tsx` — Context de autenticación
- `next.config.ts` — basePath para GitHub Pages
- `public/logos/` — Logos de ligas en PNG
- `.env.local` — Credenciales Supabase (no commitear)

## Autenticación

- Registro, login, recuperación de contraseña via Supabase Auth
- Perfil extendido en tabla `profiles` con `team_id` FK → teams
- Pronósticos en tabla `predictions` con `prediction_scorers`
- Rutas protegidas: /perfil, /pronosticar, /mis-pronosticos
- Team locked once chosen (no se puede cambiar)

## Funcionalidades

- Selección de equipo bloqueada una vez elegida
- Pronósticos filtrados por equipo del usuario (próximos 3 partidos)
- Goleadores: 3 barras por equipo, dropdown con jugadores predefinidos + posición
- Lock 30 min antes del partido
- Lock después de guardar (no se puede re-editar)
- Logos de equipos desde TheSportsDB
- Badges de competencia con color y logo
- Rankings con puntos

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
```
