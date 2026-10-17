-- ============================================================================
-- Limpieza de rendimiento: índices sin uso + policy SELECT redundante
-- Fecha: 2026-10-17
-- Contexto: avisos restantes del advisor de Supabase (performance) tras el
--   fix de RLS anti-copia (2026-10-17_rls_anti_copia_predictions.sql).
--
-- 1) Índice nunca usado (idx_scan = 0 desde el último reset de estadísticas):
--      - public.idx_players_name (players.name) -> ninguna query filtra por
--        nombre; pronosticar filtra por team (.in("team", ...)) y ya usa
--        idx_players_team (159 scans). Solo costaba escritura y espacio.
--    OJO: public.idx_profiles_team_id NO se elimina. Aunque tampoco se ha usado,
--    cubre la FK profiles_team_id_fkey; quitarlo solo traslada el aviso del
--    advisor (unused_index INFO -> unindexed_foreign_keys INFO) y encarece los
--    DELETE/UPDATE sobre teams. Se mantiene a propósito.
--
-- 2) Policy SELECT duplicada en public.profiles:
--      - "Public profiles are viewable by everyone" USING (true)
--      - "Users can view own profile"               USING (auth.uid() = user_id)
--    La segunda está subsumida por la primera (y profiles no tiene PII), así que
--    se elimina para dejar una sola policy permisiva de SELECT.
--    NO se toca ninguna policy de INSERT/UPDATE.
--
-- Idempotente: se puede re-ejecutar sin error.
-- ============================================================================

BEGIN;

-- 1) Índices sin uso ---------------------------------------------------------
DROP INDEX IF EXISTS public.idx_players_name;

-- 2) Policy SELECT redundante en profiles -----------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3) Comprobación de que profiles sigue siendo legible (RLS intacto) --------
DO $$
DECLARE
  n_profiles integer;
  n_policies_select integer;
BEGIN
  SELECT count(*) INTO n_policies_select
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT';

  IF n_policies_select < 1 THEN
    RAISE EXCEPTION 'profiles quedaría sin policy de SELECT (n=%): abortando', n_policies_select;
  END IF;

  SELECT count(*) INTO n_profiles FROM public.profiles;
  RAISE NOTICE 'profiles: % filas, % policy(s) SELECT tras la limpieza', n_profiles, n_policies_select;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
              WHERE ns.nspname = 'public' AND c.relname = 'idx_players_name') THEN
    RAISE EXCEPTION 'quedaron índices sin eliminar';
  END IF;
  IF to_regclass('public.idx_profiles_team_id') IS NULL THEN
    RAISE EXCEPTION 'idx_profiles_team_id debe seguir existiendo (cubre profiles_team_id_fkey)';
  END IF;
END $$;

COMMIT;
