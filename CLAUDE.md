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
- `src/app/providers.tsx` — AuthProvider wrapper
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Componente de clasificación
- `src/lib/supabase.ts` — Cliente Supabase
- `src/contexts/AuthContext.tsx` — Context de autenticación
- `next.config.ts` — basePath para GitHub Pages
- `public/logos/` — Logos de ligas en PNG
- `.env.local` — Credenciales Supabase (no commitear)

## Autenticación

- Registro, login, recuperación de contraseña via Supabase Auth
- Perfil extendido en tabla `profiles`
- Pronósticos en tabla `predictions`
- Rutas protegidas: /perfil, /pronosticar, /mis-pronosticos

## Comandos útiles

```bash
npm run build    # Verificar que compila sin errores
npm run dev      # Desarrollo local
```
