-- ============================================================================
-- ENDURECIMIENTO COMPLETO — aplicado en producción el 2026-10-13
-- ============================================================================
-- Contexto: la base de producción (ilkndkqcmxvlufxaugog) NO tenía aplicada la
-- migración 2026-09-16_security_hardening.sql (faltaban sus funciones, triggers
-- y políticas), y además se detectó un fallo BLOQUEANTE nuevo: cualquier usuario
-- podía escribir su propia columna `points` por REST mientras el partido estaba
-- abierto, y el ranking público confiaba en ese valor.
--
-- Esta migración es idempotente y deja la base en el estado endurecido correcto:
--   * VULN-001/003/004/005 (cierre de pronósticos, dedupe de goleadores,
--     superviviente de solo lectura, club bloqueado).
--   * Elimina las políticas LEGACY duplicadas de prediction_scorers y profiles
--     (eran permisivas y, al sumarse por OR, anulaban el candado de tiempo).
--   * [NUEVO] `points`/`created_at` solo los escribe el servidor (service role).
--
-- Ejecutar en el SQL Editor o vía Management API:
--   POST https://api.supabase.com/v1/projects/<ref>/database/query
-- ============================================================================

-- 0) Deriva de esquema
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.matches     ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1) Helpers del cierre de pronósticos
CREATE OR REPLACE FUNCTION public.effective_kickoff(p_match_date timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN p_match_date IS NULL THEN NULL
    WHEN (p_match_date AT TIME ZONE 'UTC')::time = time '00:00:00'
      THEN (((p_match_date AT TIME ZONE 'UTC')::date + time '20:00') AT TIME ZONE 'UTC')
    ELSE p_match_date
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_match_open_for_prediction(p_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT COALESCE(
    (SELECT now() <= public.effective_kickoff(m.match_date) - interval '1 minute'
       FROM public.matches m WHERE m.id = p_match_id),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION public.effective_kickoff(timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_open_for_prediction(uuid) TO anon, authenticated;

-- 2) PREDICTIONS — cierre de 1 minuto en la base
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.predictions;
CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_match_open_for_prediction(match_id));

DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;
CREATE POLICY "Users can update own predictions" ON public.predictions FOR UPDATE
USING  ((SELECT auth.uid()) = user_id AND public.is_match_open_for_prediction(match_id))
WITH CHECK ((SELECT auth.uid()) = user_id AND public.is_match_open_for_prediction(match_id));

-- 3) PREDICTION_SCORERS — eliminar TODAS las políticas legacy y recrear las canónicas
DROP POLICY IF EXISTS "Users can insert own prediction scorers" ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can insert own scorers"            ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can update own prediction scorers" ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can update own scorers"            ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can delete own prediction scorers" ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can delete own scorers"            ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can view own scorers"              ON public.prediction_scorers;

CREATE POLICY "Users can insert own prediction scorers" ON public.prediction_scorers FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.predictions p
  WHERE p.id = prediction_id AND p.user_id = (SELECT auth.uid())
    AND public.is_match_open_for_prediction(p.match_id)));

CREATE POLICY "Users can update own prediction scorers" ON public.prediction_scorers FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.predictions p
  WHERE p.id = prediction_id AND p.user_id = (SELECT auth.uid())
    AND public.is_match_open_for_prediction(p.match_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.predictions p
  WHERE p.id = prediction_id AND p.user_id = (SELECT auth.uid())
    AND public.is_match_open_for_prediction(p.match_id)));

CREATE POLICY "Users can delete own prediction scorers" ON public.prediction_scorers FOR DELETE
USING (EXISTS (SELECT 1 FROM public.predictions p
  WHERE p.id = prediction_id AND p.user_id = (SELECT auth.uid())));

-- 4) VULN-003 — dedupe + rango + única por pronóstico + tope por equipo
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY prediction_id, player_name ORDER BY created_at, id) AS rn
  FROM public.prediction_scorers
)
DELETE FROM public.prediction_scorers WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE public.prediction_scorers DROP CONSTRAINT IF EXISTS prediction_scorers_goals_range;
ALTER TABLE public.prediction_scorers
  ADD CONSTRAINT prediction_scorers_goals_range CHECK (goals >= 1 AND goals <= 10);

CREATE UNIQUE INDEX IF NOT EXISTS prediction_scorers_unique_player
  ON public.prediction_scorers (prediction_id, player_name);

CREATE OR REPLACE FUNCTION public.enforce_max_scorers_per_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.prediction_scorers ps
   WHERE ps.prediction_id = NEW.prediction_id AND ps.team = NEW.team
     AND ps.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF v_count >= 5 THEN RAISE EXCEPTION 'Máximo 5 goleadores por equipo y pronóstico'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_max_scorers_per_team() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_max_scorers ON public.prediction_scorers;
CREATE TRIGGER trg_enforce_max_scorers BEFORE INSERT OR UPDATE ON public.prediction_scorers
FOR EACH ROW EXECUTE FUNCTION public.enforce_max_scorers_per_team();

-- 5) VULN-004 — superviviente KO de solo lectura para el cliente
DROP POLICY IF EXISTS "Usuarios administran su estado de torneo" ON public.tournament_survivors;
DROP POLICY IF EXISTS "Alta inicial de superviviente" ON public.tournament_survivors;
CREATE POLICY "Alta inicial de superviviente" ON public.tournament_survivors FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'ALIVE' AND eliminated_at_round IS NULL
  AND history = '[]'::jsonb
  AND active_team_id = (SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Mantenimiento limitado del propio superviviente" ON public.tournament_survivors;
CREATE POLICY "Mantenimiento limitado del propio superviviente" ON public.tournament_survivors FOR UPDATE
USING ((SELECT auth.uid()) = user_id AND status = 'ALIVE' AND history = '[]'::jsonb
  AND active_team_id = (SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())))
WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'ALIVE' AND eliminated_at_round IS NULL
  AND history = '[]'::jsonb
  AND active_team_id = (SELECT p.team_id FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Borrar el propio superviviente" ON public.tournament_survivors;
CREATE POLICY "Borrar el propio superviviente" ON public.tournament_survivors FOR DELETE
USING ((SELECT auth.uid()) = user_id);

-- 6) VULN-005 — club bloqueado (canoniza políticas de profiles)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"       ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"       ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.enforce_team_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.team_id IS NOT NULL AND NEW.team_id IS DISTINCT FROM OLD.team_id
     AND COALESCE(current_setting('app.reset_participation', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'El club ya está confirmado: usá "Reiniciar participación" para cambiarlo (pone tus puntos en 0)';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_team_lock() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_team_lock ON public.profiles;
CREATE TRIGGER trg_enforce_team_lock BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_lock();

-- 7) reset_participation (0 pts real)
CREATE OR REPLACE FUNCTION public.reset_participation()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.app_meta (key, value) VALUES ('revoked:' || v_user_id::text, now()::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  DELETE FROM public.prediction_scorers WHERE prediction_id IN
    (SELECT id FROM public.predictions WHERE user_id = v_user_id);
  DELETE FROM public.predictions WHERE user_id = v_user_id;
  DELETE FROM public.tournament_survivors WHERE user_id = v_user_id;

  PERFORM set_config('app.reset_participation', 'on', true);
  UPDATE public.profiles SET team_id = NULL WHERE user_id = v_user_id;
END; $$;
REVOKE ALL ON FUNCTION public.reset_participation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_participation() TO authenticated;

-- 8) [NUEVO] points/created_at: solo el servidor los escribe.
-- OJO: NO usar SECURITY DEFINER aquí — cambiaría `current_user` al dueño de la
-- función y la comprobación de rol quedaría inútil. Se decide por el rol del JWT
-- (service_role) o por SQL directo de administración.
CREATE OR REPLACE FUNCTION public.enforce_points_service_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  v_role := COALESCE((current_setting('request.jwt.claims', true)::json)->>'role','');
  IF v_role = 'service_role' THEN RETURN NEW; END IF;
  IF v_role = '' AND session_user IN ('postgres','supabase_admin','service_role') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.points IS NOT NULL THEN RAISE EXCEPTION 'points solo lo asigna el servidor'; END IF;
    IF NEW.created_at IS NOT NULL AND abs(extract(epoch from (now() - NEW.created_at))) > 1 THEN
      RAISE EXCEPTION 'created_at solo lo asigna el servidor'; END IF;
  ELSE
    IF NEW.points IS DISTINCT FROM OLD.points THEN RAISE EXCEPTION 'points solo lo asigna el servidor'; END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'created_at inmutable'; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enforce_points_service_only() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_points_server_only ON public.predictions;
CREATE TRIGGER trg_points_server_only BEFORE INSERT OR UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.enforce_points_service_only();

-- 9) Privilegios de funciones internas
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- rls_auto_enable es una función de EVENT TRIGGER; revocar EXECUTE de PUBLIC
-- (anon/authenticated heredan de PUBLIC) silencia el advisor y no afecta al trigger.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
