# CLAUDE.md

Este archivo contiene información para agentes de código. Ver AGENTS.md para reglas detalladas.

## Proyecto

4° Concurso Interliga — Landing page de pronósticos de fútbol con tablas de posiciones por liga.

## Stack clave

- Next.js 16 + App Router + static export
- Tailwind CSS v4 (colores custom en `globals.css` con `@theme`)
- TypeScript estricto

## Archivos importantes

- `src/app/page.tsx` — Landing principal
- `src/app/globals.css` — Paleta de colores (navy + gold)
- `src/app/tabla/[league]/TablaLigaClient.tsx` — Componente de clasificación
- `next.config.ts` — basePath para GitHub Pages
- `public/logos/` — Logos de ligas en PNG
