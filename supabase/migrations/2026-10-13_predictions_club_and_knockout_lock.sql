-- ============================================================================
-- BLOQUEO DE REGLAS EN LA BASE (2026-10-13, segunda pasada) — idempotente
-- ============================================================================
-- Cierra dos reglas que vivían SOLO en el cliente (evadibles por REST con la
-- anon key + una sesión propia) y un hueco de reescritura del superviviente:
--   A) Solo se puede pronosticar partidos de TU club (profiles.team_id).
--   B) No se puede pronosticar un partido de copa KO si tu survivor de esa copa
--      está ELIMINATED.
--   C) El superviviente eliminado o con progreso no se puede borrar por el
--      cliente (evita borrar+reinsertar para "revivir").
--
-- Retroactivo verificado: 57/57 predicciones existentes son del club del usuario
-- y hay 0 survivors eliminados → estas reglas no alteran ningún dato actual.
-- ============================================================================

-- A) Helpers
CREATE OR REPLACE FUNCTION public.match_cup_slug(p_league text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN l LIKE '%champions%' THEN 'champions'
    WHEN l LIKE '%europa%' AND l NOT LIKE '%conference%' THEN 'europa'
    WHEN l LIKE '%conference%' THEN 'conference'
    WHEN l LIKE '%copa italia%' OR l LIKE '%coppa%' THEN 'coppaitalia'
    WHEN l LIKE '%fa cup%' THEN 'facup'
    WHEN l LIKE '%copa del rey%' THEN 'copadelrey'
    WHEN l LIKE '%dfb%' THEN 'dfbpokal'
    ELSE NULL END
  FROM (SELECT lower(coalesce(p_league,'')) AS l) x;
$$;

-- ¿Es un partido de fase KO de esa copa? Copas domésticas: siempre.
-- Copas europeas: fase liga sep-ene, KO feb-ago (igual que el cliente).
CREATE OR REPLACE FUNCTION public.is_ko_cup_match(p_league text, p_match_date timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT CASE
    WHEN public.match_cup_slug(p_league) IN ('coppaitalia','facup','copadelrey','dfbpokal') THEN true
    WHEN public.match_cup_slug(p_league) IN ('champions','europa','conference')
      THEN extract(month from (p_match_date AT TIME ZONE 'UTC')) BETWEEN 2 AND 8
    ELSE false END;
$$;

-- B) ¿Puede el usuario pronosticar este partido según su estado de copa?
CREATE OR REPLACE FUNCTION public.is_prediction_cup_allowed(p_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.tournament_survivors ts ON ts.user_id = (SELECT auth.uid())
    WHERE m.id = p_match_id
      AND ts.status = 'ELIMINATED'
      AND ts.tournament_slug = public.match_cup_slug(m.league)
      AND public.is_ko_cup_match(m.league, m.match_date)
  );
$$;

-- A) ¿Es un partido del club elegido por el usuario?
CREATE OR REPLACE FUNCTION public.is_users_club_match(p_user_id uuid, p_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.profiles pr ON pr.user_id = p_user_id
    JOIN public.teams t ON t.id = pr.team_id
    WHERE m.id = p_match_id AND (m.home_team = t.name OR m.away_team = t.name)
  );
$$;

GRANT EXECUTE ON FUNCTION public.match_cup_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_ko_cup_match(text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_prediction_cup_allowed(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_users_club_match(uuid, uuid) TO anon, authenticated;

-- A+B) PREDICTIONS
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.predictions;
CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
  AND public.is_users_club_match((SELECT auth.uid()), match_id)
  AND public.is_prediction_cup_allowed(match_id)
);

DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;
CREATE POLICY "Users can update own predictions" ON public.predictions FOR UPDATE
USING (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
  AND public.is_users_club_match((SELECT auth.uid()), match_id)
  AND public.is_prediction_cup_allowed(match_id)
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND public.is_match_open_for_prediction(match_id)
  AND public.is_users_club_match((SELECT auth.uid()), match_id)
  AND public.is_prediction_cup_allowed(match_id)
);

-- C) Survivor: no se puede borrar si está eliminado o tiene progreso
DROP POLICY IF EXISTS "Borrar el propio superviviente" ON public.tournament_survivors;
CREATE POLICY "Borrar el propio superviviente" ON public.tournament_survivors FOR DELETE
USING ((SELECT auth.uid()) = user_id AND status = 'ALIVE' AND history = '[]'::jsonb);
