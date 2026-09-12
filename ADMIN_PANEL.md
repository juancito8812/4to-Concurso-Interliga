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
├── /page.tsx                    # Dashboard principal con métricas
├── /equipos/page.tsx            # Gestión de equipos (225)
├── /equipos/[id]/page.tsx       # Edición de equipo
├── /jugadores/page.tsx          # Gestión de jugadores (7.097)
├── /jugadores/[id]/page.tsx     # Edición de jugador
├── /partidos/page.tsx           # Gestión de fixtures (1.650)
├── /partidos/[id]/page.tsx      # Edición de partido + resultado
├── /usuarios/page.tsx           # Lista de participantes
├── /usuarios/[id]/page.tsx      # Perfil de usuario + predicciones
├── /pronosticos/page.tsx        # Predicciones evaluadas
├── /resultados/page.tsx         # Evaluación manual de partidos
├── /survivors/page.tsx          # Estado de supervivencia por copa
├── /config/page.tsx             # Configuración del concurso
└── /logs/page.tsx               # Logs de actividad
```

---

## Módulos del Admin

### 1. Dashboard (`/admin`)

**Métricas en tiempo real:**
- Total de usuarios registrados
- Usuarios activos (con predicciones esta semana)
- Partidos pendientes / finalizados
- Predicciones enviadas / evaluadas
- Estado del cron (última ejecución, éxito/fallo)

**Acciones rápidas:**
- Evaluar partidos manualmente
- Sincronizar con ESPN
- Exportar datos a CSV

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

-- Admin puede actualizar cualquier perfil
CREATE POLICY "Admin update all" ON profiles
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'admin'
  ));
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
- [ ] Auth con rol `admin`
- [ ] Layout del admin (sidebar + header)
- [ ] Dashboard con métricas básicas
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
- [ ] Estado de supervivencia por copa
- [ ] Panel de configuración
- [ ] Logs de actividad

### Fase 5: Extras (1-2 días)
- [ ] Importar/exportar CSV
- [ ] Gráficos de actividad
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

**Estado:** Pendiente de implementación
**Prioridad:** Baja (documentado para futuro)
**Estimación:** 8-12 días de desarrollo
