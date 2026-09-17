-- ==============================================================================
-- 4° CONCURSO INTERLIGA — MIGRACIÓN DE SEGURIDAD (2026-09-16)
-- ==============================================================================
-- Cierra las 5 vulnerabilidades de la revisión de seguridad del 16/09/2026.
-- En todas, la regla del concurso existía SOLO en el cliente (React) y se podía
-- evadir llamando directo a la API REST de Supabase con la anon key pública
-- (que es pública por diseño) más una sesión propia (el registro es abierto).
--
-- Aplica las reglas donde no se pueden evadir: la base de datos.
--
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
-- Ejecutar en el SQL Editor del dashboard de Supabase, o con la Management API:
--   POST https://api.supabase.com/v1/projects/<ref>/database/query
--
-- VULN-001  Pronóstico retroactivo (puntaje de partidos ya terminados)
-- VULN-003  Inflación de puntos repitiendo el mismo goleador
-- VULN-004  Estado del superviviente knockout controlado por el cliente
-- VULN-005  Cambio de club sin pagar el "Reiniciar participación" (0 pts)
-- ==============================================================================


-- ==============================================================================
-- VULN-001 — El cierre de pronósticos (1 minuto antes del inicio) pasa a la base
-- ==============================================================================
-- Antes: la política de INSERT/UPDATE solo validaba propiedad (auth.uid() = user_id),
-- así que cualquier participante podía insertar por REST un pronóstico con el
-- marcador exacto de un partido YA TERMINADO y el cron le asignaba puntos en la
-- siguiente corrida (máximo 2 h). Verificado en producción: existían 2 filas con
-- created_at posterior al kickoff y con puntos asignados.

-- Hora efectiva de inicio: los partidos sin horario confirmado llegan a medianoche
-- UTC y se tratan como jornada vespertina (20:00 UTC), igual que
-- getEffectiveMatchTime() en src/app/pronosticar/page.tsx.
CREATE OR REPLACE FUNCTION public.effective_kickoff(p_match_date timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_match_date IS NULL THEN NULL
    WHEN (p_match_date AT TIME ZONE 'UTC')::time = time '00:00:00'
      THEN (((p_match_date AT TIME ZONE 'UTC')::date + time '20:00') AT TIME ZONE 'UTC')
    ELSE p_match_date
  END;
$$;

-- ¿Sigue abierto el partido para pronosticar? true solo si falta más de 1 minuto.
-- Si el partido no existe en la tabla matches devuelve false (fail-closed).
CREATE OR REPLACE FUNCTION public.is_match_open_for_prediction(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT now() <= public.effective_kickoff(m.match_date) - interval '1 minute'
       FROM public.matches m
      WHERE m.id = p_match_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.effective_kickoff(timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_open_for_prediction(uuid) TO anon, authenticated;

-- Pronósticos: solo se crean/actualizan mientras el partido está abierto.
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.predictions;
CREATE POLICY "Users can insert own predictions"
ON public.predictions FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
);

DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;
CREATE POLICY "Users can update own predictions"
ON public.predictions FOR UPDATE
USING (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
);

-- Goleadores: mismo cierre (se guardan en tabla aparte, con su propio INSERT/UPDATE).
DROP POLICY IF EXISTS "Users can insert own prediction scorers" ON public.prediction_scorers;
CREATE POLICY "Users can insert own prediction scorers"
ON public.prediction_scorers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.predictions p
     WHERE p.id = prediction_id
       AND p.user_id = (SELECT auth.uid())
       AND public.is_match_open_for_prediction(p.match_id)
  )
);

DROP POLICY IF EXISTS "Users can update own prediction scorers" ON public.prediction_scorers;
CREATE POLICY "Users can update own prediction scorers"
ON public.prediction_scorers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.predictions p
     WHERE p.id = prediction_id
       AND p.user_id = (SELECT auth.uid())
       AND public.is_match_open_for_prediction(p.match_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.predictions p
     WHERE p.id = prediction_id
       AND p.user_id = (SELECT auth.uid())
       AND public.is_match_open_for_prediction(p.match_id)
  )
);


-- ==============================================================================
-- VULN-003 — Tope de goleadores y un jugador una sola vez por pronóstico
-- ==============================================================================
-- Antes: la UI permitía elegir al mismo jugador en varios slots y el motor sumaba
-- +1 por cada repetición (hasta +5 puntos por un solo gol real). En producción ya
-- había 2 pronósticos con "Raphinha" duplicado (ambos con 7 pts asignados).

-- 1. Dedupe previa (imprescindible para poder crear el índice único del punto 3).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY prediction_id, player_name
           ORDER BY created_at, id
         ) AS rn
    FROM public.prediction_scorers
)
DELETE FROM public.prediction_scorers
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Rango de goles coherente con la UI (1..10, ver el stepper [-] [+]).
ALTER TABLE public.prediction_scorers DROP CONSTRAINT IF EXISTS prediction_scorers_goals_range;
ALTER TABLE public.prediction_scorers
  ADD CONSTRAINT prediction_scorers_goals_range CHECK (goals >= 1 AND goals <= 10);

-- 3. Un mismo jugador no puede figurar dos veces en el mismo pronóstico.
CREATE UNIQUE INDEX IF NOT EXISTS prediction_scorers_unique_player
  ON public.prediction_scorers (prediction_id, player_name);

-- 4. Máximo 5 goleadores por equipo (antes solo lo limitaba addScorerSlot en la UI).
CREATE OR REPLACE FUNCTION public.enforce_max_scorers_per_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.prediction_scorers ps
   WHERE ps.prediction_id = NEW.prediction_id
     AND ps.team = NEW.team
     AND ps.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Máximo 5 goleadores por equipo y pronóstico';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_max_scorers_per_team() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_max_scorers ON public.prediction_scorers;
CREATE TRIGGER trg_enforce_max_scorers
BEFORE INSERT OR UPDATE ON public.prediction_scorers
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_scorers_per_team();


-- ==============================================================================
-- VULN-004 — El superviviente knockout pasa a ser de solo lectura para el cliente
-- ==============================================================================
-- Antes: la política era FOR ALL con WITH CHECK (auth.uid() = user_id), así que el
-- dueño podía reescribir status ('ELIMINATED' → 'ALIVE'), active_team_id (elegir al
-- favorito) e history. El cliente incluso persistía su propia progresión.
-- Ahora: el cliente solo puede crear su fila inicial (su propio club, vivo, sin
-- historial) y borrarla. La progresión, las transferencias de camiseta y la
-- eliminación las escribe el cron con la service role key (bypass RLS).

ALTER TABLE public.tournament_survivors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de tournament_survivors" ON public.tournament_survivors;
CREATE POLICY "Lectura pública de tournament_survivors"
ON public.tournament_survivors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Usuarios administran su estado de torneo" ON public.tournament_survivors;

DROP POLICY IF EXISTS "Alta inicial de superviviente" ON public.tournament_survivors;
CREATE POLICY "Alta inicial de superviviente"
ON public.tournament_survivors FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND status = 'ALIVE'
  AND eliminated_at_round IS NULL
  AND history = '[]'::jsonb
  AND active_team_id = (
    SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Mantenimiento limitado del propio superviviente" ON public.tournament_survivors;
CREATE POLICY "Mantenimiento limitado del propio superviviente"
ON public.tournament_survivors FOR UPDATE
USING (
  (SELECT auth.uid()) = user_id
  AND status = 'ALIVE'
  AND history = '[]'::jsonb
  AND active_team_id = (
    SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND status = 'ALIVE'
  AND eliminated_at_round IS NULL
  AND history = '[]'::jsonb
  AND active_team_id = (
    SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Borrar el propio superviviente" ON public.tournament_survivors;
CREATE POLICY "Borrar el propio superviviente"
ON public.tournament_survivors FOR DELETE
USING ((SELECT auth.uid()) = user_id);


-- ==============================================================================
-- VULN-005 — El club queda bloqueado y el reinicio es el único camino
-- ==============================================================================
-- Antes: la política de profiles permitía UPDATE de cualquier columna de la fila
-- propia, incluido team_id, así que un PATCH por REST cambiaba de club conservando
-- todos los puntos (la UI dice "Equipo confirmado — no se puede cambiar").
-- Ahora: cambiar team_id fuera de public.reset_participation() lanza excepción.

CREATE OR REPLACE FUNCTION public.enforce_team_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Elegir club por primera vez (NULL → valor) siempre está permitido.
  IF OLD.team_id IS NOT NULL
     AND NEW.team_id IS DISTINCT FROM OLD.team_id
     AND COALESCE(current_setting('app.reset_participation', true), 'off') <> 'on'
  THEN
    RAISE EXCEPTION 'El club ya está confirmado: usá "Reiniciar participación" para cambiarlo (pone tus puntos en 0)';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_team_lock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_team_lock ON public.profiles;
CREATE TRIGGER trg_enforce_team_lock
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_lock();

-- Reinicio de participación: borra pronósticos, goleadores y supervivientes, libera
-- el club y marca la revocación para que el cron purgue los puntos del archivo
-- oficial (sin esa marca, los puntos seguirían contando en el ranking).
CREATE OR REPLACE FUNCTION public.reset_participation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.app_meta (key, value)
  VALUES ('revoked:' || v_user_id::text, now()::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  DELETE FROM public.prediction_scorers
   WHERE prediction_id IN (
     SELECT id FROM public.predictions WHERE user_id = v_user_id
   );

  DELETE FROM public.predictions WHERE user_id = v_user_id;
  DELETE FROM public.tournament_survivors WHERE user_id = v_user_id;

  -- Habilita el cambio de club únicamente dentro de esta transacción.
  PERFORM set_config('app.reset_participation', 'on', true);

  UPDATE public.profiles SET team_id = NULL WHERE user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_participation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_participation() TO authenticated;


-- ==============================================================================
-- Deriva de esquema: columnas declaradas en supabase/schema.sql que no existen
-- en producción (rompían cualquier consulta/trigger que las usara).
-- ==============================================================================
ALTER TABLE public.profiles  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.matches   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ==============================================================================
-- Fin de la migración. Verificación sugerida:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'prediction_scorers';
--   SELECT policyname FROM pg_policies WHERE tablename IN ('predictions','prediction_scorers','tournament_survivors');
--   SELECT proname FROM pg_proc WHERE proname IN ('effective_kickoff','is_match_open_for_prediction','enforce_max_scorers_per_team','enforce_team_lock','reset_participation');
--   SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;
-- ==============================================================================
