\set ON_ERROR_STOP on

-- ==========================================================================
-- SEED (como postgres: bypass RLS, simula datos ya existentes en producción)
-- ==========================================================================
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'tester@example.com', '{"display_name":"Tester"}'),
  ('22222222-2222-4222-8222-222222222222', 'nuevo@example.com',  '{"display_name":"Nuevo"}')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles
   SET team_id = (SELECT id FROM public.teams WHERE name = 'Real Madrid' LIMIT 1)
 WHERE user_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.matches (id, home_team, away_team, match_date, league, result_home, result_away) VALUES
  ('22222222-2222-4222-8222-222222222222', 'Real Madrid', 'Barcelona', now() - interval '2 days', 'LaLiga', 2, 1),
  ('33333333-3333-4333-8333-333333333333', 'Real Madrid', 'Sevilla',   now() + interval '2 days', 'LaLiga', NULL, NULL),
  ('55555555-5555-4555-8555-555555555555', 'Real Madrid', 'Valencia',  (now() + interval '1 day')::date, 'LaLiga', NULL, NULL),
  ('66666666-6666-4666-8666-666666666666', 'Real Madrid', 'Getafe',    ((now() - interval '1 day')::date), 'LaLiga', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Pronóstico YA existente de un partido terminado (para probar que no se puede editar)
INSERT INTO public.predictions (id, user_id, match_id, home_score, away_score, created_at)
VALUES ('44444444-4444-4444-8444-444444444444',
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222', 1, 0, now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

\echo ''
\echo '=========== SESIÓN COMO authenticated (RLS ACTIVO) ==========='

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text, true);

\echo ''
\echo '--- VULN-001: farmeo de puntos con partidos ya terminados ---'

DO $$
BEGIN
  BEGIN
    INSERT INTO public.predictions (user_id, match_id, home_score, away_score)
    VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 2, 1);
    RAISE NOTICE '❌ VULN-001 INSERT de partido terminado: PERMITIDO (vulnerable)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-001 INSERT de partido terminado: bloqueado por RLS';
  END;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.predictions SET home_score = 2, away_score = 1
   WHERE id = '44444444-4444-4444-8444-444444444444';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE NOTICE '✅ VULN-001 UPDATE de pronóstico de partido terminado: bloqueado (0 filas)';
  ELSE
    RAISE NOTICE '❌ VULN-001 UPDATE de pronóstico de partido terminado: % filas modificadas', n;
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.predictions SET points = 99 WHERE id = '44444444-4444-4444-8444-444444444444';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE NOTICE '✅ VULN-001 UPDATE de puntos a mano: bloqueado (0 filas)';
  ELSE
    RAISE NOTICE '❌ VULN-001 UPDATE de puntos a mano: % filas (vulnerable)', n;
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.prediction_scorers (prediction_id, player_name, goals, team)
    VALUES ('44444444-4444-4444-8444-444444444444', 'Vinícius Júnior', 1, 'home');
    RAISE NOTICE '❌ VULN-001 INSERT de goleador en partido terminado: PERMITIDO';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-001 INSERT de goleador en partido terminado: bloqueado';
  END;
END $$;

\echo ''
\echo '--- VULN-001 (control): el partido abierto SÍ se puede pronosticar ---'

DO $$
DECLARE v_id uuid; n int;
BEGIN
  INSERT INTO public.predictions (user_id, match_id, home_score, away_score)
  VALUES ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 3, 0)
  RETURNING id INTO v_id;

  UPDATE public.predictions SET home_score = 4 WHERE id = v_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '✅ Control: INSERT + UPDATE de partido abierto permitido (update % filas)', n;

  INSERT INTO public.prediction_scorers (prediction_id, player_name, goals, team)
  VALUES (v_id, 'Kylian Mbappé', 2, 'home');
  RAISE NOTICE '✅ Control: goleador en partido abierto permitido';
END $$;

\echo ''
\echo '--- VULN-001 (control): partido sin horario (00:00Z) abierto durante su jornada ---'

DO $$
DECLARE open_today boolean; open_yesterday boolean;
BEGIN
  SELECT public.is_match_open_for_prediction('55555555-5555-4555-8555-555555555555') INTO open_today;
  SELECT public.is_match_open_for_prediction('66666666-6666-4666-8666-666666666666') INTO open_yesterday;
  IF open_today AND NOT open_yesterday THEN
    RAISE NOTICE '✅ Control: medianoche UTC = jornada vespertina (hoy abierto, ayer cerrado)';
  ELSE
    RAISE NOTICE '❌ Control medianoche: hoy=% ayer=%', open_today, open_yesterday;
  END IF;
END $$;

\echo ''
\echo '--- VULN-003: duplicar goleadores ---'

DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.predictions
   WHERE match_id = '33333333-3333-4333-8333-333333333333' LIMIT 1;

  BEGIN
    INSERT INTO public.prediction_scorers (prediction_id, player_name, goals, team)
    VALUES (v_id, 'Kylian Mbappé', 3, 'home');
    RAISE NOTICE '❌ VULN-003 jugador duplicado: PERMITIDO (infla la Regla #4)';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ VULN-003 jugador duplicado: bloqueado por índice único';
  END;

  BEGIN
    INSERT INTO public.prediction_scorers (prediction_id, player_name, goals, team)
    VALUES (v_id, 'Goles Imposibles', 11, 'home');
    RAISE NOTICE '❌ VULN-003 goals=11: PERMITIDO';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ VULN-003 goals fuera de rango (11): bloqueado por CHECK';
  END;

  BEGIN
    INSERT INTO public.prediction_scorers (prediction_id, player_name, goals, team)
    VALUES (v_id, 'Relleno 1', 1, 'home'), (v_id, 'Relleno 2', 1, 'home'),
           (v_id, 'Relleno 3', 1, 'home'), (v_id, 'Relleno 4', 1, 'home'),
           (v_id, 'Relleno 5', 1, 'home');
    RAISE NOTICE '❌ VULN-003 tope de 5 por equipo: PERMITIDO';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE '✅ VULN-003 sexto goleador del mismo equipo: bloqueado por trigger';
  END;
END $$;

\echo ''
\echo '--- VULN-004: revivir / transferir el superviviente ---'

DO $$
DECLARE v_team uuid; v_other uuid; v_id uuid;
BEGIN
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = '11111111-1111-4111-8111-111111111111';
  SELECT id INTO v_other FROM public.teams WHERE name = 'Barcelona' LIMIT 1;

  BEGIN
    INSERT INTO public.tournament_survivors (user_id, tournament_slug, active_team_id, status, history)
    VALUES ('11111111-1111-4111-8111-111111111111', 'champions', v_other, 'ALIVE', '[]'::jsonb);
    RAISE NOTICE '❌ VULN-004 alta con club ajeno: PERMITIDO';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-004 alta con club ajeno: bloqueado';
  END;

  INSERT INTO public.tournament_survivors (user_id, tournament_slug, active_team_id, status, history)
  VALUES ('11111111-1111-4111-8111-111111111111', 'champions', v_team, 'ALIVE', '[]'::jsonb)
  RETURNING id INTO v_id;

  BEGIN
    INSERT INTO public.tournament_survivors (user_id, tournament_slug, active_team_id, status, history)
    VALUES ('11111111-1111-4111-8111-111111111111', 'champions', v_team, 'ELIMINATED',
            jsonb_build_array(jsonb_build_object('from_team','Real Madrid','to_team','Barcelona','match_id','x','round','Final','date','2027-05-01')));
    RAISE NOTICE '❌ VULN-004 alta/upgrade con status ELIMINATED o historial: PERMITIDO';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '(alta duplicada: cae en el índice único, se prueba el UPDATE aparte)';
  WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-004 alta con status/historial inyectado: bloqueado';
  END;
END $$;

DO $$
DECLARE n int;
BEGIN
  BEGIN
    UPDATE public.tournament_survivors SET status = 'ELIMINATED', eliminated_at_round = 'Final'
     WHERE user_id = '11111111-1111-4111-8111-111111111111' AND tournament_slug = 'champions';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE NOTICE '✅ VULN-004 auto-eliminación (status ELIMINATED): bloqueado (0 filas)';
    ELSE RAISE NOTICE '❌ VULN-004 auto-eliminación: % filas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-004 auto-eliminación (status ELIMINATED): bloqueado por RLS';
  END;
END $$;

DO $$
DECLARE n int; v_other uuid;
BEGIN
  SELECT id INTO v_other FROM public.teams WHERE name = 'Barcelona' LIMIT 1;
  BEGIN
    UPDATE public.tournament_survivors SET active_team_id = v_other
     WHERE user_id = '11111111-1111-4111-8111-111111111111' AND tournament_slug = 'champions';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE NOTICE '✅ VULN-004 transferencia de camiseta a mano: bloqueada (0 filas)';
    ELSE RAISE NOTICE '❌ VULN-004 transferencia a mano: % filas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-004 transferencia de camiseta a mano: bloqueada por RLS';
  END;
END $$;

DO $$
DECLARE n int;
BEGIN
  BEGIN
    UPDATE public.tournament_survivors SET history = '[{"from_team":"Real Madrid","to_team":"Barcelona"}]'::jsonb
     WHERE user_id = '11111111-1111-4111-8111-111111111111' AND tournament_slug = 'champions';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE NOTICE '✅ VULN-004 historial inyectado a mano: bloqueado (0 filas)';
    ELSE RAISE NOTICE '❌ VULN-004 historial inyectado: % filas', n; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ VULN-004 historial inyectado a mano: bloqueado por RLS';
  END;
END $$;

\echo ''
\echo '--- VULN-005: cambio de club gratis ---'

DO $$
DECLARE v_other uuid;
BEGIN
  SELECT id INTO v_other FROM public.teams WHERE name = 'Barcelona' LIMIT 1;
  BEGIN
    UPDATE public.profiles SET team_id = v_other
     WHERE user_id = '11111111-1111-4111-8111-111111111111';
    RAISE NOTICE '❌ VULN-005 cambio de club directo: PERMITIDO (conserva puntos)';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE '✅ VULN-005 cambio de club directo: bloqueado por trigger';
  END;
END $$;

DO $$
DECLARE n int;
BEGIN
  UPDATE public.profiles SET display_name = 'Tester Renombrado'
   WHERE user_id = '11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN RAISE NOTICE '✅ Control: editar el apodo sigue permitido';
  ELSE RAISE NOTICE '❌ Control: editar el apodo quedó bloqueado (% filas)', n; END IF;
END $$;

DO $$
DECLARE v_team uuid; n int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '22222222-2222-4222-8222-222222222222', 'role', 'authenticated')::text, true);
  SELECT id INTO v_team FROM public.teams WHERE name = 'Arsenal' LIMIT 1;

  UPDATE public.profiles SET team_id = v_team
   WHERE user_id = '22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN RAISE NOTICE '✅ Control: elegir club por primera vez (NULL → valor) permitido';
  ELSE RAISE NOTICE '❌ Control: no se pudo elegir club por primera vez (% filas)', n; END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-4111-8111-111111111111', 'role', 'authenticated')::text, true);
END $$;

\echo ''
\echo '--- VULN-005: el camino sancionado (reset_participation) sí funciona ---'

DO $$
DECLARE v_preds int; v_scorers int; v_surv int; v_team uuid; v_marker text;
BEGIN
  INSERT INTO public.tournament_survivors (user_id, tournament_slug, active_team_id, status, history)
  SELECT '11111111-1111-4111-8111-111111111111', 'europa', team_id, 'ALIVE', '[]'::jsonb
    FROM public.profiles WHERE user_id = '11111111-1111-4111-8111-111111111111';

  PERFORM public.reset_participation();

  SELECT count(*) INTO v_preds FROM public.predictions WHERE user_id = '11111111-1111-4111-8111-111111111111';
  SELECT count(*) INTO v_surv  FROM public.tournament_survivors WHERE user_id = '11111111-1111-4111-8111-111111111111';
  SELECT team_id INTO v_team FROM public.profiles WHERE user_id = '11111111-1111-4111-8111-111111111111';

  -- app_meta tiene RLS sin políticas (solo service role), así que la verificación de la
  -- marca se hace volviendo al rol de sesión (postgres), como haría el cron.
  RESET ROLE;
  SELECT value INTO v_marker FROM public.app_meta WHERE key = 'revoked:11111111-1111-4111-8111-111111111111';
  SET LOCAL ROLE authenticated;

  IF v_preds = 0 AND v_surv = 0 AND v_team IS NULL AND v_marker IS NOT NULL THEN
    RAISE NOTICE '✅ reset_participation(): pronósticos y survivors borrados, club liberado y marca de revocación creada';
  ELSE
    RAISE NOTICE '❌ reset_participation(): preds=% survivors=% team=% marker=%', v_preds, v_surv, v_team, v_marker IS NOT NULL;
  END IF;
END $$;

\echo ''
\echo '--- Control final: sesión anónima no puede escribir nada ---'
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.predictions (user_id, match_id, home_score, away_score)
    VALUES ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 1, 0);
    RAISE NOTICE '❌ anon INSERT predictions: PERMITIDO';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '✅ anon INSERT predictions: bloqueado';
  END;
END $$;
ROLLBACK;

\echo ''
\echo '=========== FIN DE LAS PRUEBAS ==========='
