# Panel de Administración - 4° Concurso Interliga

## Visión General

El panel de administración permitirá al propietario del sitio gestionar todos los aspectos del concurso sin modificar código fuente. Se implementará como rutas `/admin/*` protegidas por autenticación.

---

## Stack Recomendado

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16 (App Router) — mismo stack actual |
| **Auth** | Supabase Auth (rol `admin` en tabla `profiles`) |
| **DB** | Supabase PostgreSQL (mismas tablas, nuevas RPCs) |
| **UI** | Tailwind CSS + componentes existentes |
| **Deploy** | GitHub Pages (estático) + API routes si es necesario |

---

## Estructura de Rutas

```
/admin
├── /page.tsx                    # ✅ Dashboard con métricas (RPC admin_dashboard_stats)
├── /login/page.tsx              # ✅ Login exclusivo del panel
├── /cuenta/page.tsx             # ✅ Correo + cambio de contraseña
├── /equipos/page.tsx            # ⬜ Gestión de equipos (225)
├── /equipos/[id]/page.tsx       # ⬜ Edición de equipo
├── /jugadores/page.tsx          # ⬜ Gestión de jugadores (517 en base)
├── /jugadores/[id]/page.tsx     # ⬜ Edición de jugador
├── /partidos/page.tsx           # ⬜ Gestión de fixtures (1.926)
├── /partidos/[id]/page.tsx      # ⬜ Edición de partido + resultado
├── /usuarios/page.tsx           # ⬜ Lista de participantes
├── /usuarios/[id]/page.tsx      # ⬜ Perfil de usuario + predicciones
├── /pronosticos/page.tsx        # ⬜ Predicciones evaluadas
├── /resultados/page.tsx         # ⬜ Evaluación manual de partidos
├── /survivors/page.tsx          # ⬜ Estado de supervivencia por copa
├── /config/page.tsx             # ⬜ Configuración del concurso
└── /logs/page.tsx               # ⬜ Logs de actividad
```

> El estado de supervivientes ya se ve **resumido por copa** dentro del dashboard; la ruta `/survivors` solo agregaría el detalle por participante.

---

## Módulos del Admin

### 1. Dashboard (`/admin`) — ✅ implementado (2026-11-01)

Lee todo de una sola RPC, `public.admin_dashboard_stats()` (`supabase/migrations/2026-11-01_admin_dashboard_stats.sql`), `SECURITY DEFINER` con chequeo `is_admin()`: si no sos admin lanza excepción, y solo `authenticated` tiene `EXECUTE`. Devuelve un único `jsonb`:

| Clave | Contenido |
|---|---|
| `participants` | `total`, `with_club`, `admins`, `new_7d` |
| `predictions` | `total`, `scored`, `last_24h`, `last_7d`, `last_at` |
| `matches` | `total`, `with_result`, `overdue` (sin resultado, con más de 3 h de inicio, dentro de los últimos 7 días) |
| `survivors` | `alive`, `eliminated`, `total` |
| `activity_7d` | `[{date, count}]` de los últimos 7 días |
| `top_clubs` | `[{name, league, logo_url, count}]` |
| `cups` | `[{slug, alive, eliminated, total}]` |

**Widgets en pantalla:**
- 6 KPIs (participantes, pronósticos, partidos con resultado, pendientes de resultado, supervivientes vivos, altas de 7 días).
- Aviso ámbar si `matches.overdue > 0`, con la instrucción de revisar el cron o cargar el resultado a mano.
- Barras de actividad de 7 días + hora del último pronóstico.
- Clubes más elegidos (logo, barra proporcional sobre las cuentas con club).
- Supervivientes por copa KO (vivos / fuera).
- Cobertura del build actual: fixtures, partidos con resultado, último resultado cargado, ligas del calendario.
- Próximos 6 partidos con cuenta atrás al cierre (`Cerrado` / `Cierra en X min` / `h` / `d`).
- Botón **Actualizar** que reejecuta la RPC sin recargar la página.

**Detalles de implementación:**
- Los fixtures y resultados salen de los JSON estáticos ya publicados (`/data/officialFixtures.json`, `/data/officialEvaluatedMatches.json`), así que el bloque "build actual" refleja el último deploy, no la DB.
- Fechas siempre en `America/Caracas`; el reloj se refresca cada 60 s.
- `admin_dashboard_stats()` no filtra datos sensibles de otros usuarios: solo agregados. Para ver pronósticos abiertos en claro sigue valiendo la regla anti-copia de más abajo.

#### 1.1 Tráfico del sitio — ✅ implementado (2026-11-02)

Segundo bloque del dashboard, alimentado por el cron `.github/workflows/sync-site-analytics.yml` (cada 3 h, `scripts/sync-site-analytics.mjs`). Cloudflare exige token privado, y el panel es un export estático: el navegador **nunca** habla con Cloudflare. El cron consulta la API con el token en un secret, agrega por día y hace upsert en Supabase; el panel lee por la RPC `public.admin_site_stats(p_days integer default 30)` (`SECURITY DEFINER` + `is_admin()`, ventana acotada a 1-90 días).

| Clave | Contenido |
|---|---|
| `totals` | `requests`, `page_views`, `uniques_avg`, `uniques_max`, `bytes`, `threats`, `rum_pageviews`, `rum_visits` |
| `yesterday` | Último día cerrado: `day`, `rum_pageviews`, `rum_visits`, `page_views`, `uniques`, `requests` |
| `daily` | `[{date, rum_pageviews, rum_visits, page_views, uniques}]` de la ventana |
| `top_paths` / `top_countries` / `top_referers` / `top_browsers` | `[{key, hits}]` (8 / 6 / 6 / 5) |
| `last_sync`, `window_days`, `generated_at` | Frescura y tamaño de la ventana |

**Fuentes:** Zone Analytics (peticiones, vistas de zona, únicos, bytes, cache ratio, amenazas) y Web Analytics RUM (páginas vistas y visitas de navegadores reales, top rutas/países/referentes/navegadores). Los RUM son la métrica de audiencia; `requests` incluye bots y assets.

**Privacidad:** solo agregados diarios, sin IP ni user agent. `site_stats_daily` y `site_stats_breakdown` tienen RLS **sin policies**: anon/authenticated no las leen en claro, únicamente por la RPC.

**Operación:** si el run falla por permisos, el panel conserva el último sync y muestra la fecha de `last_sync`; se puede forzar con `gh workflow run sync-site-analytics.yml --ref main -f days=30`.

**Acciones rápidas:** enlaces a `/ranking`, `/pronosticar` y `/admin/cuenta`. Evaluar partidos manualmente y sincronizar con ESPN siguen pendientes (fases 2-3).

---

### 2. Gestión de Equipos (`/admin/equipos`)

**Campos editables:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID interno (no editable) |
| `name` | text | Nombre oficial del equipo |
| `logo_url` | text | URL del escudo |
| `league` | select | Liga perteneciente |

**Funcionalidades:**
- Listado con búsqueda y filtros por liga
- Crear / editar / eliminar equipos
- Importar desde CSV/JSON
- Validación de duplicados

---

### 3. Gestión de Jugadores (`/admin/jugadores`)

**Campos editables:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID interno |
| `name` | text | Nombre completo |
| `team` | text | Equipo actual |
| `position` | select | Posición (Delantero, Centrocampista, Defensor, Arquero) |
| `active` | boolean | Jugador activo |

**Funcionalidades:**
- Listado paginado con búsqueda por nombre/equipo
- Filtros por posición y equipo
- Edición masiva (cambiar equipo a varios jugadores)
- Importar plantillas actualizadas desde ESPN API

---

### 4. Gestión de Partidos (`/admin/partidos`)

**Campos editables:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID determinístico |
| `home_team` | text | Equipo local |
| `away_team` | text | Equipo visitante |
| `match_date` | datetime | Fecha y hora del partido |
| `league` | select | Competición |
| `result_home` | number | Goles local (editable manualmente) |
| `result_away` | number | Goles visitante (editable manualmente) |

**Funcionalidades:**
- Calendario visual (vista mes/semana)
- Filtros por liga, fecha, estado
- Resultado manual para partidos no cubiertos por ESPN
- Re-evaluación de predicciones tras cambio de resultado

---

### 5. Gestión de Usuarios (`/admin/usuarios`)

**Campos visibles:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | UUID | ID de Supabase Auth |
| `display_name` | text | Nombre de usuario |
| `team_id` | FK | Equipo favorito |
| `created_at` | datetime | Fecha de registro |
| `total_points` | number | Puntos acumulados |

**Funcionalidades:**
- Listado con búsqueda por nombre
- Ver predicciones de un usuario
- Resetear puntos de un usuario
- Cambiar equipo de un usuario
- Eliminar usuario (con confirmación)

---

### 6. Evaluación de Predicciones (`/admin/resultados`)

**Flujo:**
1. Seleccionar partido finalizado
2. Ver todas las predicciones para ese partido
3. Evaluar manualmente si el cron no lo hizo
4. Aplicar puntos individualmente
5. Re-calcular ranking

**Vista:**
```
┌─────────────────────────────────────────────┐
│ Partido: Real Madrid vs Barcelona           │
│ Resultado: 2 - 1                            │
│                                             │
│ Usuario      | Predicción | Puntos | Acción |
│------------- | ---------- | ------ | ------ |
│ Juan         | 2-1        | 5 pts  | ✓      |
│ María        | 1-0        | 3 pts  | ✓      |
│ Pedro        | 3-2        | 0 pts  | ✓      |
│                                             │
│ [Evaluar Todos] [Recalcular Ranking]        │
└─────────────────────────────────────────────┘
```

---

### 7. Supervivientes (`/admin/survivors`)

**Vista por copa:**
```
┌─────────────────────────────────────────────┐
│ Champions League - Ronda: Octavos            │
│                                             │
│ Usuario   | Equipo Actual | Estado          |
| --------- | ------------- | --------------- |
│ Juan      | Real Madrid   | 🟢 ALIVE        |
| María     | Man City      | 🔴 ELIMINATED   |
│ Pedro     | Bayern Munich | 🟢 ALIVE        |
│                                             │
│ [Exportar] [Resetear Copa]                  │
└─────────────────────────────────────────────┘
```

---

### 8. Configuración (`/admin/config`)

**Ajustes editables:**
- Fechas de cierre de pronósticos
- Sistema de puntos (valores)
- Copas activas
- Mensajes informativos
- Configuración de WhatsApp grupo

---

## Seguridad

### Autenticación
```sql
-- Agregar columna role a profiles
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Solo admins acceden a rutas /admin
-- Verificar en Server Components y API routes
```

### Políticas RLS para Admin
```sql
-- Admin puede leer todo
CREATE POLICY "Admin read all" ON profiles
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));

-- ⚠️ NO crear policies de UPDATE amplias como la de abajo: contradice la nota de más abajo.
-- Las escrituras de admin van por RPCs SECURITY DEFINER con chequeo de rol `admin`
-- (o Edge Functions con la service role key).
-- CREATE POLICY "Admin update all" ON profiles FOR UPDATE USING (...)  -- ❌ anti-patrón
```

### Protección de Rutas
```typescript
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (profile?.role !== 'admin') redirect('/');
  
  return <>{children}</>;
}
```

> **⚠️ Importante (2026-10-13):** las escrituras de admin **deben** respetar las reglas ya blindadas en la base: `points`/`created_at` solo los escribe el `service_role` (trigger `trg_points_server_only`), el club está bloqueado (`trg_enforce_team_lock`), y la elegibilidad de pronósticos (`is_users_club_match`, `is_prediction_cup_allowed`) aplica. Por eso las operaciones sensibles del admin deben ir por **RPCs `SECURITY DEFINER` con chequeo de rol `admin`** o por Edge Functions con la service role key — **no** agregando políticas RLS de `UPDATE` amplias que abran la puerta a saltarse esas reglas.

> **⚠️ Nota anti-copia (2026-10-17):** la política de "Admin read all" debe aplicarse **con cuidado sobre `predictions`/`prediction_scorers`**: la lectura pública ya está restringida a partidos ya iniciados y el panel lee lo abierto enmascarado por la RPC `get_public_predictions(p_user_id)`. Un admin que necesite ver pronósticos abiertos en claro debe hacerlo con la **service role key** (server-side), nunca ampliando una política RLS de `SELECT` para `authenticated`.

---

## API Routes (si se necesita)

```
/api/admin/equipos       → GET, POST, PUT, DELETE
/api/admin/jugadores     → GET, POST, PUT, DELETE
/api/admin/partidos      → GET, POST, PUT
/api/admin/usuarios      → GET, PUT, DELETE
/api/admin/evaluar       → POST (evaluar predicciones)
/api/admin/sync-espn     → POST (forzar sincronización)
/api/admin/export        → GET (exportar CSV)
```

---

## UI/UX Recomendado

### Layout del Admin
```
┌──────────────────────────────────────────────┐
│ 🏆 INTERLIGA ADMIN           [Juan Admin] 🔽 │
├──────────────────────────────────────────────┤
│ ┌──────┐                                     │
│ │ Menu │  ┌──────────────────────────────┐   │
│ │      │  │                              │   │
│ │ Dash │  │    Contenido Principal       │   │
│ │ Equip│  │                              │   │
│ │ Jugad│  │                              │   │
│ │ Part │  │                              │   │
│ │ Usuar│  │                              │   │
│ │ Resul│  │                              │   │
│ │ Survi│  │                              │   │
│ │ Config│ │                              │   │
│ │ Logs │  │                              │   │
│ └──────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Componentes a Crear
- `AdminSidebar.tsx` — Navegación lateral
- `AdminHeader.tsx` — Barra superior con usuario
- `DataTable.tsx` — Tabla genérica con paginación y búsqueda
- `FormField.tsx` — Campos de formulario reutilizables
- `ConfirmDialog.tsx` — Diálogo de confirmación
- `StatsCard.tsx` — Tarjeta de métricas
- `SearchInput.tsx` — Búsqueda con debounce

---

## Datos que el Cliente Puede Editar

| Categoría | Datos | Frecuencia |
|-----------|-------|------------|
| **Equipos** | Nombre, logo, liga | Temporada |
| **Jugadores** | Nombre, equipo, posición | Semanal |
| **Partidos** | Fecha, resultado | Diaria |
| **Usuarios** | Nombre, equipo, puntos | Bajo demanda |
| **Config** | Puntos, fechas, mensajes | Bajo demanda |

---

## Importación/Exportación

### Importar desde CSV
```csv
name,team,position
Erling Haaland,Manchester City,Delantero
Vinicius Jr,Real Madrid,Delantero
```

### Exportar a CSV
- Usuarios con puntos
- Predicciones evaluadas
- Estado de supervivientes
- Log de actividad

---

## Roadmap de Implementación

### Fase 1: Admin Básico (2-3 días)
- [x] Auth con rol `admin`
- [x] Layout del admin (guard de sesión + rol en cliente)
- [x] Dashboard con métricas (KPIs, actividad 7d, clubes, copas, próximos partidos)
- [ ] CRUD de equipos

### Fase 2: Gestión de Datos (2-3 días)
- [ ] CRUD de jugadores
- [ ] CRUD de partidos
- [ ] Edición de resultados

### Fase 3: Usuarios y Evaluación (2-3 días)
- [ ] Listado de usuarios
- [ ] Ver predicciones de usuario
- [ ] Evaluación manual de partidos

### Fase 4: Supervivientes y Config (1-2 días)
- [x] Estado de supervivencia por copa (resumen en el dashboard)
- [ ] Estado de supervivencia por copa (detalle por participante)
- [ ] Panel de configuración
- [ ] Logs de actividad

### Fase 5: Extras (1-2 días)
- [ ] Importar/exportar CSV
- [x] Gráficos de actividad (barras de 7 días)
- [ ] Notificaciones

---

## Costos Adicionales

| Concepto | Costo |
|----------|-------|
| **Desarrollo** | 8-12 días de trabajo |
| **Servicios** | $0 (usa Supabase existente) |
| **Mantenimiento** | Mínimo (mismo stack) |

---

## Consideraciones para el Cliente

### Requisitos Mínimos
- Conocimientos básicos de navegación web
- Acceso a Supabase Dashboard (para emergencias)
- Contraseña segura para el admin

### Capacitación Requerida
- 1-2 horas para el uso básico
- Documentación de usuario incluida
- Soporte por WhatsApp (grupo ya configurado)

### Mantenimiento
- Actualizar jugadores: importar CSV de ESPN
- Resultados: automático via cron (manual si falla)
- Backups: automáticos de Supabase

---

## Documentación para el Cliente

Crear `MANUAL_ADMIN.md` con:
1. Guía de inicio de sesión
2. Cómo editar equipos
3. Cómo agregar jugadores
4. Cómo registrar resultados
5. Cómo ver usuarios
6. Troubleshooting básico

---

## Notas de Implementación

- **NO** usar `output: "export"` para rutas admin (necesitan server rendering)
- Usar middleware para proteger rutas `/admin/*`
- Considerar usar Supabase Edge Functions para operaciones pesadas
- Mantener el admin separado del frontend público
- Usar los mismos componentes de UI (Tailwind, navy theme)

---

**Estado:** fases 2-5 pendientes; el dashboard (fase 1) está implementado.
**Prioridad:** Baja (documentado para futuro)
**Estimación restante:** 6-9 días de desarrollo
