# Especificación Técnica: Sistema "Sobreviviente / Herencia de Equipo" en Torneos Knock-out

**Fecha:** 2026-08-28  
**Estado:** Aprobado para Planificación  
**Competiciones aplicables:** Champions League, Europa League, Conference League, Copa Italia  

---

## 1. Resumen Ejecutivo

El sistema **"Sobreviviente / Herencia de Equipo"** (*Knockout Survivor*) introduce una mecánica de supervivencia y transferencia dinámica de club en los torneos de eliminación directa:
1. **Club de Liga Regular:** El club principal de liga del participante (LaLiga, Premier League, Serie A, Bundesliga) permanece **fijo e inmutable**.
2. **Estado Independiente por Copa:** Cada torneo de copa gestiona de forma autónoma su propio estado de supervivencia (`VIVO` o `KO`) y el club activo del participante en dicha copa.
3. **Mecánica de Transferencia:** Si en un partido de eliminación directa el participante pronostica que el equipo rival avanzará y acierta, el participante **continúa vivo** y **hereda la camiseta del equipo ganador** para las siguientes fases de esa copa.
4. **Eliminación:** Si el equipo pronosticado por el usuario no resulta ganador / clasificado, el participante queda en estado **KO (Eliminado)** de esa copa por el resto de la temporada.

---

## 2. Reglas del Negocio y Lógica de Supervivencia

### 2.1 Inicialización de Club por Torneo
- **Caso A (El club principal participa en la copa):**  
  El usuario ingresa automáticamente con su club principal asignado como club activo en esa copa.
- **Caso B (El club principal NO participa en la copa):**  
  Al ingresar a la sección de pronósticos de dicha copa, el usuario selecciona su club inicial entre los participantes clasificados a ese torneo.

### 2.2 Evaluación de Resultados en Llaves de Eliminación Directa
Sea $E_{\text{activo}}$ el club activo del usuario en la copa, y el partido $E_1 \text{ vs } E_2$ donde uno de ellos es $E_{\text{activo}}$.
El usuario emite su pronóstico con el equipo pronosticado ganador $E_{\text{pred}}$, y el equipo que clasifica/gana finalmente es $E_{\text{real}}$:

1. **Acierto a favor del rival ($E_{\text{pred}} \neq E_{\text{activo}}$ y $E_{\text{real}} == E_{\text{pred}}$):**
   - **Estado:** `ALIVE` (Vivo).
   - **Acción:** El club activo del usuario se transfiere a $E_{\text{pred}}$.
   - **Registro:** Se añade una entrada al historial de transferencias: $E_{\text{activo}} \rightarrow E_{\text{pred}}$.
2. **Acierto a favor de su propio club ($E_{\text{pred}} == E_{\text{activo}}$ y $E_{\text{real}} == E_{\text{pred}}$):**
   - **Estado:** `ALIVE` (Vivo).
   - **Acción:** Mantiene $E_{\text{activo}}$.
3. **Fallo en el pronóstico ($E_{\text{real}} \neq E_{\text{pred}}$):**
   - **Estado:** `ELIMINATED` (KO).
   - **Acción:** Queda fuera de la copa y no puede continuar pronosticando en las rondas sucesivas de esa competición.

---

## 3. Modelo de Datos (PostgreSQL / Supabase)

### 3.1 Tabla `tournament_survivors`
```sql
CREATE TABLE IF NOT EXISTS tournament_survivors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_slug TEXT NOT NULL, -- 'champions', 'europa', 'conference', 'coppaitalia'
  active_team_id UUID REFERENCES teams(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ALIVE' CHECK (status IN ('ALIVE', 'ELIMINATED')),
  eliminated_at_round TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tournament_slug)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tournament_survivors_user ON tournament_survivors(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_survivors_slug ON tournament_survivors(tournament_slug);

-- Políticas RLS
ALTER TABLE tournament_survivors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de tournament_survivors"
  ON tournament_survivors FOR SELECT
  USING (true);

CREATE POLICY "Usuarios administran su estado de torneo"
  ON tournament_survivors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.2 Estructura del campo `history` (JSONB)
```json
[
  {
    "from_team_name": "Real Madrid",
    "to_team_name": "Manchester City",
    "match_id": "00000000-0000-4000-8000-000017f44691",
    "round": "Octavos de Final",
    "date": "2027-02-18T20:00:00Z"
  }
]
```

---

## 4. Arquitectura de Componentes y Flujo de Datos

```
                                  ┌────────────────────────┐
                                  │   Supabase Database    │
                                  │ (tournament_survivors) │
                                  └───────────┬────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       │                                             │
                       ▼                                             ▼
           ┌───────────────────────┐                     ┌───────────────────────┐
           │ src/lib/survivor.ts   │                     │  src/app/pronosticar  │
           │ • getSurvivorStatus   │                     │  • Selector de club   │
           │ • evaluateSurvivor    │                     │  • Banner Knockout    │
           │ • initSurvivorCup     │                     │  • Transferencia auto │
           └───────────┬───────────┘                     └───────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│ Landing Card ││ Mis Pronóst. ││   Ranking    │
│ (Estado Copas││ (Timeline de ││ (Filtro por  │
│  en vivo)    ││  Camisetas)  ││  Superviv.)  │
└──────────────┘└──────────────┘└──────────────┘
```

---

## 5. Módulos y Cambios en la Interfaz de Usuario

1. **`src/lib/survivor.ts`:**
   - Módulo centralizado con funciones puras y llamadas a Supabase:
     - `getUserCupSurvivors(userId: string)`: Obtiene el estado del usuario en todas las copas.
     - `resolveMatchSurvivor(prediction, matchResult)`: Calcula si el usuario sobrevive o transfiere equipo.
     - `setInitialCupTeam(userId, tournamentSlug, teamId)`: Asigna club inicial para torneos donde su club base no participe.

2. **Landing Page (`src/app/CompetitionStatusCard.tsx` - Tarjeta #3):**
   - Muestra el estado interactivo de las 4 copas con badges:
     - 🇪🇺 **Champions:** 🟢 VIVO (`Manchester City`)
     - 🟠 **Europa League:** 🟢 VIVO (`Roma`)
     - 🟢 **Conference League:** 🟢 VIVO (`Fiorentina`)
     - 🇮🇹 **Copa Italia:** 🔴 KO (`Eliminado en 16avos`)

3. **Sección Pronósticos (`src/app/pronosticar/page.tsx`):**
   - En partidos de copa, muestra una alerta informativa de **Modo Knock-out / Herencia de Camiseta**.
   - Si el usuario está en estado `ELIMINATED` en esa copa, deshabilita el envío para esa competición con un banner elegante explicativo.
   - Si no tiene club en esa copa, le permite seleccionarlo antes de pronosticar.

4. **Mis Pronósticos (`src/app/mis-pronosticos/page.tsx`):**
   - Muestra la línea de tiempo de camisetas en cada copa (ej: *Iniciaste con Real Madrid $\rightarrow$ Actual: Manchester City*).

---

## 6. Pruebas y Validación

1. **Prueba Unitaria de Transferencia:** Verificar que al pronosticar victoria del rival en un partido de copa y acertar, el equipo activo se actualice y se conserve el estado `ALIVE`.
2. **Prueba Unitaria de Eliminación:** Verificar que al errar el ganador del partido de copa, el estado cambie a `ELIMINATED`.
3. **Prueba de Aislamiento:** Confirmar que los cambios de equipo en copas **nunca** alteren el club principal del usuario en `profiles.team_id` ni afecten los partidos de liga regular.
4. **Compilación y Linters:** `npm run build` y `npm run lint` limpios con 0 errores.
