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
- **Tablas de posiciones:** `src/app/tabla/[league]/TablaLigaClient.tsx` — Fetch client-side a ESPN API + datos de ejemplo para goleadores/asistencias/tarjetas
- **Autenticación:** Supabase Auth — registro, login, recuperación de contraseña
- **Base de datos:** Supabase PostgreSQL — tablas profiles, matches, predictions
- **Colores:** Definidos en `src/app/globals.css` con `@theme` de Tailwind v4. Paleta: navy-dark (#080e1c), gold (#c9a84c), green (#1ed760)
- **Configuración:** `next.config.ts` — `basePath: "/4to-Concurso-Interliga"` es OBLIGATORIO para que funcione en GitHub Pages

### Páginas de auth

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/registro` | `src/app/registro/page.tsx` | Crear cuenta |
| `/login` | `src/app/login/page.tsx` | Iniciar sesión |
| `/olvide-contrasena` | `src/app/olvide-contrasena/page.tsx` | Recuperar contraseña |
| `/perfil` | `src/app/perfil/page.tsx` | Editar perfil (requiere auth) |
| `/pronosticar` | `src/app/pronosticar/page.tsx` | Hacer pronósticos (requiere auth) |
| `/mis-pronosticos` | `src/app/mis-pronosticos/page.tsx` | Historial (requiere auth) |
| `/ranking` | `src/app/ranking/page.tsx` | Tabla de posiciones |

### Base de datos (SQL para Supabase)

```sql
-- Tabla de perfiles
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de partidos
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  result_home INTEGER,
  result_away INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de pronósticos
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  match_id UUID REFERENCES matches(id) NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  points INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);

CREATE POLICY "Users can view own predictions" ON predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE USING (auth.uid() = user_id);
```

### Convenciones

- Usar clases de Tailwind, no CSS inline (excepto para sombras complejas)
- Los componentes de página usan `"use client"` porque necesitan hooks o datos dinámicos
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper
- No hay backend propio — todo es estático con fetch client-side
- Supabase se usa directamente desde el browser via JS client

### Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Copiar `.env.example` a `.env.local` y completar.

### Deploy

- Push a `main` triggers GitHub Actions → build → deploy a GitHub Pages
- `npm run build` genera `./out/` con archivos estáticos
- **NUNCA** agregar `basePath` a las URLs de fetch de API, solo a assets internos
- `.env.local` NO se commitea (está en .gitignore)

### Errores comunes

- Si los logos no se ven: verificar que las rutas en `img src` incluyan `/4to-Concurso-Interliga/` como prefijo
- Si el CSS no carga: verificar que `basePath` esté en `next.config.ts`
- Si las tablas no cargan: la API de ESPN funciona sin key, verificar CORS en browser
- Si auth no funciona: verificar que `.env.local` tenga las credenciales correctas de Supabase
- Si el build falla: verificar que no haya errores de TypeScript con `npm run build`
