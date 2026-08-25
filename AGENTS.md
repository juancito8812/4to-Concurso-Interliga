# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Reglas del proyecto

### Estructura

- **Landing principal:** `src/app/page.tsx` — Componente `"use client"` con datos hardcodeados (reglas, puntuación, premios, logos de ligas)
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Fetch client-side a api-sports.io
- **Colores:** Definidos en `src/app/globals.css` con `@theme` de Tailwind v4. Paleta: navy-dark (#080e1c), gold (#c9a84c), green (#1ed760)
- **Configuración:** `next.config.ts` — `basePath: "/4to-Concurso-Interliga"` es OBLIGATORIO para que funcione en GitHub Pages

### Convenciones

- Usar clases de Tailwind, no CSS inline (excepto para sombras complejas)
- Los componentes de página usan `"use client"` porque necesitan hooks o datos dinámicos
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper
- No hay backend propio — todo es estático con fetch client-side

### Deploy

- Push a `main` triggers GitHub Actions → build → deploy a GitHub Pages
- `npm run build` genera `./out/` con archivos estáticos
- **NUNCA** agregar `basePath` a las URLs de fetch de API, solo a assets internos

### Errores comunes

- Si los logos no se ven: verificar que las rutas en `img src` incluyan `/4to-Concurso-Interliga/` como prefijo
- Si el CSS no carga: verificar que `basePath` esté en `next.config.ts`
- Si las tablas no cargan: la API de api-sports.io requiere API key real para producción
