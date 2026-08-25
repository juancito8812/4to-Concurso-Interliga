# 4° Concurso Interliga

Concurso de pronósticos de fútbol para la temporada 2026-27. Los participantes eligen un equipo y compiten pronosticando resultados, marcadores y goleadores de las principales ligas y copas europeas.

## Stack

- **Framework:** Next.js 16 (App Router, static export)
- **React:** 19
- **Estilos:** Tailwind CSS v4
- **TypeScript:** 5
- **Deploy:** GitHub Pages (`output: "export"`)
- **API:** api-sports.io (tablas de posiciones)

## Estructura

```
src/app/
├── page.tsx                    # Página principal (landing)
├── layout.tsx                  # Layout con fuente DM Sans
├── globals.css                 # Paleta de colores navy + gold
├── tabla/
│   └── [league]/
│       ├── page.tsx            # Genera rutas estáticas
│       └── TablaLigaClient.tsx # Tabla de posiciones (client)
public/
├── logos/                      # Logos de ligas (PNG)
└── ...
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing principal |
| `/tabla/laliga` | Clasificación LaLiga |
| `/tabla/premier` | Clasificación Premier League |
| `/tabla/seriea` | Clasificación Serie A |
| `/tabla/bundesliga` | Clasificación Bundesliga |
| `/tabla/champions` | Clasificación Champions League |
| `/tabla/europa` | Clasificación Europa League |
| `/tabla/conference` | Clasificación Conference League |
| `/tabla/coppaitalia` | Clasificación Copa Italia |

## Comandos

```bash
npm run dev      # Desarrollo local
npm run build    # Build estático (genera ./out)
npm run lint     # ESLint
```

## Configuración importante

- `next.config.ts`: `basePath: "/4to-Concurso-Interliga"` (obligatorio para GitHub Pages)
- `next.config.ts`: `trailingSlash: true` (necesario para rutas estáticas)
- Las imágenes usan `unoptimized: true` (requisito para export estático)

## Deploy

Automático vía GitHub Actions al hacer push a `main`. Ver `.github/workflows/deploy.yml`.

**URL:** https://juancito8812.github.io/4to-Concurso-Interliga/
