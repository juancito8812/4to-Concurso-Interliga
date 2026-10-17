-- ============================================================================
-- FIX ANTI-COPIA (RLS) — predictions / prediction_scorers
-- Preparado 2026-10-17 · verificado antes de aplicar en transacción revertida
-- ============================================================================
-- PROBLEMA (auditoría de seguridad 2026-10-17):
--   La política "Predictions are viewable by everyone" (USING true, rol public)
--   dejaba que cualquiera con la anon key —que es pública, viaja en el JS del
--   sitio— leyera /rest/v1/predictions y obtuviera user_id + marcador de TODOS
--   los pronósticos, incluidos los de partidos que todavía no han empezado.
--   Medido en vivo: 66 filas visibles, 8 de ellas de partidos futuros.
--   La regla anti-copia (diffMin > 1) vivía SOLO en el frontend: no protegía.
--   Idéntico agujero en prediction_scorers ("Scorers are viewable by everyone").
--
-- ARREGLO (4 bloques, todos idempotentes):
--   1) SELECT público de predictions limitado a partidos YA INICIADOS.
--      Los pronósticos PROPIOS siguen visibles siempre (editar antes del cierre).
--   2) SELECT público de prediction_scorers limitado al partido del padre.
--   3) RPC public.get_public_predictions(uuid): mantiene el modal "Pronósticos
--      de <usuario>" (tarjeta 🔒 Abierto/Oculto) devolviendo la fila SIN
--      marcador ni puntos mientras el partido siga abierto. No expone nada que
--      el frontend no mostrara ya.
--   4) Higiene: revocar TRUNCATE / TRIGGER / REFERENCES de anon y authenticated.
--      No son explotables vía PostgREST (RLS no los cubre), es defensa en
--      profundidad.
--   + Rendimiento: eliminar índices duplicados exactos.
--
-- La regla de puntuación NO se toca (npm run verify sigue siendo el candado).
-- Reversión: ver bloque ROLLBACK al final del archivo.
-- ============================================================================

BEGIN;

-- 1) PREDICTIONS — el público solo ve partidos ya iniciados -------------------
-- Se fusionan las dos políticas SELECT permisivas (la pública y la de "own") en
-- una sola para evitar la doble evaluación por fila que reporta el advisor.
DROP POLICY IF EXISTS "Predictions are viewable by everyone"            ON public.predictions;
DROP POLICY IF EXISTS "Users can view own predictions"                  ON public.predictions;
DROP POLICY IF EXISTS "Predictions propias o de partidos ya iniciados"  ON public.predictions;
CREATE POLICY "Predictions propias o de partidos ya iniciados" ON public.predictions
FOR SELECT TO public
USING (
  (SELECT auth.uid()) = user_id
  OR public.is_match_open_for_prediction(match_id) IS NOT TRUE
);

-- 2) PREDICTION_SCORERS — solo goleadores de partidos ya iniciados ------------
-- El EXISTS sobre predictions queda además sujeto a la RLS de predictions, así
-- que el filtro público y el propio coinciden sin código extra.
DROP POLICY IF EXISTS "Scorers are viewable by everyone"                ON public.prediction_scorers;
DROP POLICY IF EXISTS "Users can view own scorers"                      ON public.prediction_scorers;
DROP POLICY IF EXISTS "Scorers de partidos ya iniciados"                ON public.prediction_scorers;
CREATE POLICY "Scorers de partidos ya iniciados" ON public.prediction_scorers
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.predictions p
    WHERE p.id = prediction_scorers.prediction_id
      AND (
        p.user_id = (SELECT auth.uid())
        OR public.is_match_open_for_prediction(p.match_id) IS NOT TRUE
      )
  )
);

-- 3) RPC get_public_predictions — proyección segura para el modal de ranking --
-- Devuelve la existencia del pronóstico (para poder pintar la tarjeta 🔒) pero
-- con marcador y puntos en NULL mientras el partido esté abierto.
CREATE OR REPLACE FUNCTION public.get_public_predictions(p_user_id uuid)
RETURNS TABLE (
  id         uuid,
  user_id    uuid,
  match_id   uuid,
  home_score integer,
  away_score integer,
  points     integer,
  is_hidden  boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    p.user_id,
    p.match_id,
    CASE WHEN public.is_match_open_for_prediction(p.match_id) IS NOT TRUE
         THEN p.home_score END,
    CASE WHEN public.is_match_open_for_prediction(p.match_id) IS NOT TRUE
         THEN p.away_score END,
    CASE WHEN public.is_match_open_for_prediction(p.match_id) IS NOT TRUE
         THEN p.points END,
    public.is_match_open_for_prediction(p.match_id) IS TRUE AS is_hidden
  FROM public.predictions p
  WHERE p_user_id IS NOT NULL
    AND p.user_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.get_public_predictions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_predictions(uuid) TO anon, authenticated;

-- 4) Higiene de privilegios de tabla -----------------------------------------
-- TRUNCATE / REFERENCES / TRIGGER nunca los necesita el cliente (PostgREST solo
-- usa SELECT/INSERT/UPDATE/DELETE) y no pasan por RLS.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- 5) Rendimiento — índices duplicados exactos --------------------------------
DROP INDEX IF EXISTS public.idx_prediction_scorers_pred_id;  -- = idx_prediction_scorers_prediction_id
DROP INDEX IF EXISTS public.idx_predictions_user_match;       -- = predictions_user_id_match_id_key

COMMIT;

-- ============================================================================
-- ROLLBACK (pegar en el SQL Editor si algo falla)
-- ============================================================================
-- BEGIN;
-- DROP POLICY IF EXISTS "Predictions propias o de partidos ya iniciados" ON public.predictions;
-- CREATE POLICY "Predictions are viewable by everyone" ON public.predictions FOR SELECT TO public USING (true);
-- CREATE POLICY "Users can view own predictions"       ON public.predictions FOR SELECT TO public USING ((SELECT auth.uid()) = user_id);
-- DROP POLICY IF EXISTS "Scorers de partidos ya iniciados" ON public.prediction_scorers;
-- CREATE POLICY "Scorers are viewable by everyone" ON public.prediction_scorers FOR SELECT TO public USING (true);
-- DROP FUNCTION IF EXISTS public.get_public_predictions(uuid);
-- CREATE INDEX IF NOT EXISTS idx_prediction_scorers_pred_id ON public.prediction_scorers (prediction_id);
-- CREATE INDEX IF NOT EXISTS idx_predictions_user_match     ON public.predictions (user_id, match_id);
-- GRANT TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- COMMIT;
-- ============================================================================
