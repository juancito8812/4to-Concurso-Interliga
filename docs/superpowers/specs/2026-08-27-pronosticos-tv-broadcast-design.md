# Especificación de Diseño: Pronósticos Estilo Transmisión Oficial de TV

**Fecha:** 2026-08-27  
**Proyecto:** 4° Concurso Interliga  
**Ruta:** `/src/app/pronosticar/page.tsx`  

---

## 1. Visión General
Rediseñar la pantalla de pronósticos (`/pronosticar`) para ofrecer una experiencia inmersiva inspirada en los gráficos oficiales de transmisiones televisivas de fútbol (UEFA Champions League, Premier League, LaLiga), asegurando que los usuarios pronostiquen los **3 próximos partidos de su equipo**, con cierre **10 minutos antes del inicio del encuentro**, capacidad de **re-edición mientras esté abierto**, y selección de **goleadores ubicados directamente debajo de su respectivo equipo**.

---

## 2. Requerimientos Funcionales

### 2.1 Selección y Carga de Partidos
- **Filtro de equipo:** El usuario ve únicamente los partidos donde juega su equipo seleccionado (como Local o Visitante).
- **Límite de partidos:** Exactamente los **3 próximos partidos cronológicos** (`limit(3)` o `slice(0, 3)`).
- **Fuentes de datos:**
  - Si hay API key de `football-data.org` configurada y responde: se consumen partidos programados en vivo.
  - Fallback a Supabase: consulta a la tabla `matches` filtrando por fecha posterior o igual a la actual y orden ascendente por `match_date`.
- **Plantilla de jugadores:** Se consultan de la tabla `players` de Supabase todos los jugadores pertenecientes a los dos equipos que disputan el encuentro, para alimentar los selectores de goleadores.

### 2.2 Ventana de Pronóstico y Reglas de Cierre
- **Tiempo límite de cierre:** El pronóstico se bloquea **10 minutos antes** de la hora programada del partido (`match_date - now <= 10 minutos`).
- **Edición flexible (Opción A):** Si el usuario ya guardó un pronóstico para un partido pero aún faltan más de 10 minutos para el pitazo inicial, el formulario permanece **habilitado para edición**. El botón de acción reflejará "Actualizar Pronósticos" o "Guardar Pronósticos".
- **Estado Bloqueado (Lock):** Cuando `diffMin <= 10` o el partido ya comenzó / finalizó:
  - La tarjeta muestra un overlay de bloqueo visual con icono de candado 🔒 y estado "Cerrado / En juego".
  - Los campos de marcador y goleadores se deshabilitan.

### 2.3 Visualización de Competencia
- Cada tarjeta muestra en su cabecera superior:
  - Franja/borde con el color oficial de la competición (obtenido de `src/lib/leagueConfig.ts`).
  - Logo oficial de la liga (`leagueLogos[match.league]`).
  - Nombre de la competición con tipografía y color de acento.
  - Fecha del partido (ej. `Sáb 30 ago`), hora local y badge de estado (ej. `🟢 Cierra en 45 min` o `Abierto hasta 10 min antes`).

### 2.4 Panel de Goleadores Estilo Transmisión TV
- La estructura de la tarjeta se organiza en dos columnas simétricas:
  - **Lado Izquierdo (Equipo Local):**
    - Escudo del club local + Nombre en negrita.
    - Input para marcador de goles local (display numérico tipo broadcast).
    - Debajo del equipo local: Sección exclusiva para goleadores del equipo local.
    - Cada fila de goleador local permite:
      - Desplegable con jugadores del equipo local ordenados por posición (Delanteros, Mediocampistas, etc.).
      - Contador de goles con botones `[-]`, valor numérico, `[+]`.
      - Botón para eliminar goleador `✕`.
      - Posibilidad de definir hasta 3 goleadores locales.
  - **Centro:**
    - Indicador de "VS" o dos puntos `:` estilizado.
  - **Lado Derecho (Equipo Visitante):**
    - Input para marcador de goles visitante.
    - Escudo del club visitante + Nombre en negrita.
    - Debajo del equipo visitante: Sección exclusiva para goleadores del equipo visitante.
    - Cada fila de goleador visitante permite:
      - Desplegable con jugadores del equipo visitante.
      - Contador de goles con botones `[-]`, valor numérico, `[+]`.
      - Botón para eliminar goleador `✕`.
      - Posibilidad de definir hasta 3 goleadores visitantes.

---

## 3. Arquitectura y Flujo de Datos

### 3.1 Estructura de Estado en `PronosticarPage`
```typescript
interface Scorer {
  player_name: string;
  goals: number;
  team: "home" | "away";
}

interface Prediction {
  match_id: string;
  home_score: string;
  away_score: string;
  scorers: Scorer[];
  prediction_id?: string;
}
```

### 3.2 Persistencia en Supabase
1. **`predictions`:** Upsert en la tabla `predictions` usando `user_id` y `match_id` con `home_score` y `away_score`.
2. **`prediction_scorers`:**
   - Se eliminan los registros previos para `prediction_id`.
   - Se insertan los goleadores válidos no vacíos asociados al `prediction_id` con `player_name`, `goals`, y `team` ('home' | 'away').

---

## 4. Plan de Pruebas y Verificación
1. **Verificación de build y TypeScript:** Ejecutar `npm run build` para asegurar 0 errores de compilación y tipado.
2. **Verificación de UI:** Comprobar que los logos de liga, escudos de equipos, inputs de marcador y selectores de goleadores se alinean correctamente bajo cada equipo en desktop y mobile.
3. **Verificación de Regla de 10 min:** Validar que los partidos a menos de 10 minutos se bloqueen y los que tengan más de 10 minutos permitan guardar y re-editar.
