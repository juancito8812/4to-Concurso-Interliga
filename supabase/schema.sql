-- ==============================================================================
-- 4° CONCURSO INTERLIGA - ESQUEMA MAESTRO DE BASE DE DATOS Y RESTAURACIÓN
-- ==============================================================================
-- Este script recrea completamente la base de datos desde cero en Supabase:
-- 1. Extensiones requeridas (pgcrypto, uuid-ossp).
-- 2. Tablas del sistema (teams, profiles, players, matches, predictions, prediction_scorers, tournament_survivors).
-- 3. Índices de alto rendimiento (optimizados para Free Tier).
-- 4. Políticas de Row Level Security (RLS).
-- 5. Funciones y Triggers (handle_new_user, delete_user_account).
-- 6. Semilla oficial de equipos (89 clubes de Europa).
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLAS

-- A. TEAMS (Clubes oficiales)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT teams_name_league_key UNIQUE (name, league)
);

-- B. PROFILES (Perfiles de participantes)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. PLAYERS (Plantillas oficiales de jugadores)
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  league TEXT DEFAULT '',
  position TEXT DEFAULT 'Delantero',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D. MATCHES (Partidos y resultados)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  league TEXT NOT NULL,
  result_home INTEGER DEFAULT NULL,
  result_away INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- E. PREDICTIONS (Pronósticos enviados)
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT predictions_user_id_match_id_key UNIQUE (user_id, match_id)
);

-- F. PREDICTION_SCORERS (Goleadores pronosticados)
CREATE TABLE IF NOT EXISTS public.prediction_scorers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  goals INTEGER DEFAULT 1,
  team TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- G. TOURNAMENT_SURVIVORS (Estado de supervivencia y herencia de equipo en torneos de eliminación directa)
CREATE TABLE IF NOT EXISTS public.tournament_survivors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_slug TEXT NOT NULL, -- 'champions', 'europa', 'conference', 'coppaitalia'
  active_team_id UUID REFERENCES public.teams(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ALIVE' CHECK (status IN ('ALIVE', 'ELIMINATED')),
  eliminated_at_round TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tournament_slug)
);

-- 3. ÍNDICES DE RENDIMIENTO (SUB-MILISEGUNDO PARA PLAN FREE)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON public.predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_match ON public.predictions(user_id, match_id);

CREATE INDEX IF NOT EXISTS idx_prediction_scorers_pred_id ON public.prediction_scorers(prediction_id);

CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_home ON public.matches(home_team);
CREATE INDEX IF NOT EXISTS idx_matches_away ON public.matches(away_team);
CREATE INDEX IF NOT EXISTS idx_matches_league ON public.matches(league);

CREATE INDEX IF NOT EXISTS idx_teams_league ON public.teams(league);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);
CREATE INDEX IF NOT EXISTS idx_players_team ON public.players(team);
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(name);

CREATE INDEX IF NOT EXISTS idx_tournament_survivors_user ON public.tournament_survivors(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_survivors_slug ON public.tournament_survivors(tournament_slug);

-- 4. SEGURIDAD Y POLÍTICAS ROW LEVEL SECURITY (RLS)

-- A. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- B. Predictions RLS
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Predictions are viewable by everyone" ON public.predictions;
CREATE POLICY "Predictions are viewable by everyone" 
ON public.predictions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own predictions" ON public.predictions;
CREATE POLICY "Users can insert own predictions" 
ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own predictions" ON public.predictions;
CREATE POLICY "Users can update own predictions" 
ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

-- C. Prediction Scorers RLS
ALTER TABLE public.prediction_scorers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Scorers are viewable by everyone" ON public.prediction_scorers;
CREATE POLICY "Scorers are viewable by everyone" 
ON public.prediction_scorers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage prediction scorers" ON public.prediction_scorers;
CREATE POLICY "Users can manage prediction scorers" 
ON public.prediction_scorers FOR ALL USING (true) WITH CHECK (true);

-- D. Teams, Players, Matches RLS (Lectura Pública)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teams viewable by everyone" ON public.teams;
CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT USING (true);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players viewable by everyone" ON public.players;
CREATE POLICY "Players viewable by everyone" ON public.players FOR SELECT USING (true);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Matches viewable by everyone" ON public.matches;
CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);

-- E. Tournament Survivors RLS
ALTER TABLE public.tournament_survivors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura pública de tournament_survivors" ON public.tournament_survivors;
CREATE POLICY "Lectura pública de tournament_survivors"
  ON public.tournament_survivors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios administran su estado de torneo" ON public.tournament_survivors;
CREATE POLICY "Usuarios administran su estado de torneo"
  ON public.tournament_survivors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. FUNCIONES Y TRIGGERS AUTOMÁTICOS

-- Trigger para crear/sincronizar perfil al registrarse un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC para eliminar cuenta de usuario de forma total e irreversible (libera email)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Eliminar goleadores de sus pronósticos
  DELETE FROM public.prediction_scorers 
  WHERE prediction_id IN (
    SELECT id FROM public.predictions WHERE user_id = v_user_id
  );

  -- 2. Eliminar pronósticos
  DELETE FROM public.predictions WHERE user_id = v_user_id;

  -- 3. Eliminar estado de supervivencia en torneos
  DELETE FROM public.tournament_survivors WHERE user_id = v_user_id;

  -- 4. Eliminar perfil
  DELETE FROM public.profiles WHERE user_id = v_user_id;

  -- 5. Eliminar cuenta de auth.users (libera el correo)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 6. SEMILLA OFICIAL DE EQUIPOS (89 CLUBES)
INSERT INTO public.teams (id, name, league, logo_url)
VALUES
  ('f4699b22-4cf2-494c-a83c-230fd511f884', 'Augsburg', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/xqyyvq1473453233.png'),
  ('59734bcb-c905-4fb6-893b-baca3bfc9e15', 'Bayer Leverkusen', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png'),
  ('ca5b4196-1092-4611-86d0-84aa4b19fba4', 'Bayern Munich', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png'),
  ('70e94f20-c093-420d-9e18-caa53a67d76c', 'Bochum', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/kag3jy1599821108.png'),
  ('02165649-ae55-427b-bef3-e523a641f800', 'Borussia Dortmund', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png'),
  ('0774278e-7e23-4285-b0c8-356adbb2db30', 'Borussia Mönchengladbach', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/sysurw1473453380.png'),
  ('77b111d8-8bdc-4f92-9c75-1aea7ddfabef', 'Darmstadt', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/5f3dyd1608236981.png'),
  ('e749d869-286b-45e1-920b-6b9d994a6338', 'Düsseldorf', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/vgluaa1637465363.png'),
  ('62be9d29-80a0-4548-92dd-1a16e2f42c87', 'Eintracht Frankfurt', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/rurwpy1473453269.png'),
  ('02540b1f-b488-46ff-9a5a-7a6e9ced8165', 'Freiburg', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/urwtup1473453288.png'),
  ('c5774294-b422-4a28-942a-8dfacb35f8df', 'Heidenheim', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/lbj7g01608236988.png'),
  ('5d455e40-6ec3-4a18-bab5-5ce14c435c7c', 'Hoffenheim', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/9hwvb21621593919.png'),
  ('5befa2db-f180-4ee4-94b7-a20ea1c33951', 'Holstein Kiel', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/1fpmgs1514394524.png'),
  ('2954d43f-0985-47e2-928e-51e453609b4c', 'Köln', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/2j1sc91566049407.png'),
  ('0e60876d-5c4b-4ee4-b869-71d0f272b8be', 'Mainz', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/fhm9v51552134916.png'),
  ('2d88174c-429a-4fef-943b-ecd8617b2ca0', 'RB Leipzig', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/zjgapo1594244951.png'),
  ('5ecb0616-f4df-4399-b297-1855e171c81e', 'Stuttgart', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/yppyux1473454085.png'),
  ('895fa577-c432-4347-bf95-7fd4b04e7b04', 'Union Berlin', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/q0o5001599679795.png'),
  ('108389ca-db8d-4c8b-9ed5-0153f530d158', 'Werder Bremen', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/tkvqan1716960454.png'),
  ('84c6df24-9c69-4e4e-b249-2765a72e4bb6', 'Wolfsburg', 'Bundesliga', 'https://r2.thesportsdb.com/images/media/team/badge/ci9trv1778399557.png'),
  ('00ef5750-8179-43fc-8fda-3afe9b813631', 'Benfica', 'Champions League', 'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png'),
  ('c1ad2a7b-aeee-4757-b889-ae6bd58646f3', 'Paris Saint-Germain', 'Champions League', 'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png'),
  ('aa7f5742-cf12-4d91-bd0f-c250f7a73120', 'Porto', 'Champions League', 'https://r2.thesportsdb.com/images/media/team/badge/baqm4y1473503049.png'),
  ('717be119-9492-4dd8-89e8-6690d96bc42d', 'AZ Alkmaar', 'Europa League', 'https://r2.thesportsdb.com/images/media/team/badge/xzqlwr1473502983.png'),
  ('0e21320e-b47e-46fa-b8e5-63a6b230a355', 'Club Brujas', 'Europa League', ''),
  ('156aeebc-27e1-4dba-aa8c-0e631821776b', 'Dinamo Zagreb', 'Europa League', 'https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1473504663.png'),
  ('64dd63f9-9d27-4538-8725-5a2de45aec17', 'Genk', 'Europa League', 'https://r2.thesportsdb.com/images/media/team/badge/iq7c2k1473503423.png'),
  ('23fe0573-a879-42b6-81aa-de9e3a466645', 'Olympique Lyon', 'Europa League', 'https://r2.thesportsdb.com/images/media/team/badge/xzqdr11473502975.png'),
  ('763e31ec-a362-4618-bb85-3785242748cb', 'PAOK', 'Europa League', 'https://r2.thesportsdb.com/images/media/team/badge/bsm9ws1473502991.png'),
  ('9e39455b-d02f-4e59-b606-f6467242b0b5', 'Alavés', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/xzqlwr1473502983.png'),
  ('2626bc0e-684d-452a-994c-2575b7133e45', 'Athletic Bilbao', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/9j103k1473502967.png'),
  ('d59d3a07-4759-479c-911f-e11b7ae9611c', 'Atlético Madrid', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/xzaydr1473502975.png'),
  ('e5c69e98-b3ac-45c3-ba56-8625cb5150ea', 'Barcelona', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/vwvwr1473502971.png'),
  ('a89a3ac9-698e-454b-a4a9-a4baf9a03b6f', 'Celta Vigo', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1473504663.png'),
  ('d3bc3f10-3cf3-484a-a808-a6ddfc851213', 'Espanyol', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/baqm4y1473503049.png'),
  ('b63bede5-17e6-4d32-8be3-adaa85793fa7', 'Getafe', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/m68r2z1473503217.png'),
  ('847648c6-71b5-4d26-8df0-f97ed3ad85f7', 'Girona', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/rrgtpw1473503468.png'),
  ('6f2ef870-0e57-4246-994f-21b7e2984dfe', 'Las Palmas', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/th0dm11484975381.png'),
  ('15d30725-dc5b-46fa-b385-d274957c5d4c', 'Leganés', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/e3ey1z1484975431.png'),
  ('ac4f019e-e0d4-4834-8b84-03c62870e449', 'Mallorca', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/iq7c2k1473503423.png'),
  ('251148cc-024a-4a0f-98f6-73ab6d2be03d', 'Osasuna', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/rwtrsh1473503149.png'),
  ('34bd1020-6152-4516-9a47-b2eb9e3ed44d', 'Rayo Vallecano', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/0acfnt1473503178.png'),
  ('f01f312c-24ce-4fbe-b720-c78001fa067c', 'Real Betis', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/pzmz2k1589070509.png'),
  ('ca065451-9bdc-4445-a11a-2bec188cd36d', 'Real Madrid', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png'),
  ('9061153f-6e7c-459a-a6d3-9e8cc78f71b4', 'Real Sociedad', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/1dq3f01484975357.png'),
  ('7acff3de-119f-4ed5-a337-14794e8ffb0e', 'Real Valladolid', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/bsm9ws1473502991.png'),
  ('83fa191b-d14a-4079-9baa-a45f07ec6a21', 'Sevilla', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/1gvvvl1473504575.png'),
  ('3c9fa74f-74b9-4460-9e36-0586ac516b21', 'Valencia', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/xvzl3p1473504647.png'),
  ('dce6d859-e500-4fe0-b705-5bd876705fc2', 'Villarreal', 'LaLiga', 'https://r2.thesportsdb.com/images/media/team/badge/ils7rk1473504611.png'),
  ('188214ca-1fbb-47c4-b26b-a3b02fbbe4b9', 'Arsenal', 'Premier League', 'https://crests.football-data.org/57.png'),
  ('2aac308f-2b58-469f-88ae-f7e0cfef459f', 'Aston Villa', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/1wevqt1473504109.png'),
  ('79be5d66-ea00-477b-b849-00c38517f02f', 'Bournemouth', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/y08nak1534071116.png'),
  ('b5dfb6f1-9c9c-425e-9b93-ebde5aee4bce', 'Brentford', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/grv1aw1546453779.png'),
  ('35340a69-2916-44b1-a57f-bf2d4f5afd6b', 'Brighton', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/8k36g11473504103.png'),
  ('aaabdfc4-a11f-49ab-99ca-3a1d6a24b543', 'Chelsea', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1473504577.png'),
  ('d7580b4d-bb8e-4269-b929-ec67e2a7766b', 'Crystal Palace', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/ia6i3m1656014992.png'),
  ('708c0f8c-1c7a-446c-9d19-b7801effff43', 'Everton', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/eqayrf1523184794.png'),
  ('3cbef18d-ba1b-48eb-9d29-258f93b5ccea', 'Fulham', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/xwwvyt1448811086.png'),
  ('b9b71d95-cd08-412f-901b-67c7282d55f3', 'Ipswich Town', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/mdj1ey1634670785.png'),
  ('040dac16-223a-4a76-978c-0bd2216b9ece', 'Leicester City', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/xtxwtu1448813356.png'),
  ('4b8afc66-fa36-4347-8264-2c6baf0f2da2', 'Liverpool', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/uvxuqq1473502969.png'),
  ('837091ff-b593-4937-b365-821d366d5a83', 'Manchester City', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png'),
  ('9eb8c163-ccb9-4ebc-966c-2685506fe7dc', 'Manchester United', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/xzqdr11517660252.png'),
  ('550c03d8-f40d-4c22-ae22-f48a5155401b', 'Newcastle', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/rcqvix1473502979.png'),
  ('48730d17-84e5-473d-bd2a-20a3e20b1720', 'Nott. Forest', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/1i2kvh1719918076.png'),
  ('0810e969-822d-4dcd-8edf-34e3e8cd3262', 'Southampton', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/ggqtd01621593274.png'),
  ('0954eebd-f709-45d7-bf7f-ce59d76e4585', 'Tottenham', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/xzqdr11473502975.png'),
  ('39bb57b6-762f-4abc-9b39-acad931bc0ef', 'West Ham', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/hfum4l1599931799.png'),
  ('e65d159c-4b58-4ab3-a68e-45b219b2518a', 'Wolves', 'Premier League', 'https://r2.thesportsdb.com/images/media/team/badge/16posu1727839976.png'),
  ('2a140238-c24b-4724-acd0-f3472438c286', 'AC Milan', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/wvspur1448806617.png'),
  ('cdd76dbe-aa2c-42d2-9022-1ebcbc5a6e2a', 'Atalanta', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/qix5ku1780561327.png'),
  ('f793babc-6fee-4b6c-9248-dc8c3729acbd', 'Bologna', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/2qi1u31655592366.png'),
  ('e71948fc-a009-4897-95e0-95e370cc5ef1', 'Cagliari', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/wvsvxt1447534471.png'),
  ('deeeee68-ac1a-45b3-8469-f4acb8e29cbd', 'Empoli', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/c1ie6b1622561483.png'),
  ('dc1c600b-b39d-456b-95cb-52d3250d5916', 'Fiorentina', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/hc8nhu1656098030.png'),
  ('50fc4257-09cb-43b8-8692-43da2f3acdc7', 'Frosinone', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/a7xa151603170120.png'),
  ('3fe5f010-e751-417b-be73-ad6a43eed6de', 'Genoa', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/52s8dn1655553600.png'),
  ('43920e8a-3e38-420a-a217-9d2a3ca9f2e0', 'Inter Milan', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png'),
  ('f866990c-8a1e-4ed6-91d3-7679b291b61c', 'Juventus', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/uxf0gr1742983727.png'),
  ('a54e3336-50dd-4f01-bf4d-0cdc77f4f962', 'Lazio', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/rwqyvs1448806608.png'),
  ('9195192c-be9e-4dbf-9014-e834cb8dcf2c', 'Lecce', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/j4vznr1567365249.png'),
  ('da6558b7-aea1-4884-8b3a-71a9e027b39f', 'Monza', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/bxearg1603170113.png'),
  ('1084febb-d268-445e-aad1-006607d0ba3f', 'Napoli', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png'),
  ('fbbdeaae-742b-4659-901f-4a2d295e8b9f', 'Roma', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/jwro2s1760820674.png'),
  ('18f5e1f4-c3c3-4938-8523-926cc42e061c', 'Salernitana', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/nmi7mk1603170517.png'),
  ('0be24f25-dfcb-4358-8a4b-94ee3d056de1', 'Sassuolo', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/xystvp1448806138.png'),
  ('355ef0db-7b32-4c25-a7c8-354ce88bd172', 'Torino', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/xxprty1448806802.png'),
  ('42bf3882-a9bd-4666-8748-7b08690a120b', 'Udinese', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/vwvstr1448806811.png'),
  ('f8d30f38-d711-45ca-a65b-d573a7aa3c07', 'Verona', 'Serie A', 'https://r2.thesportsdb.com/images/media/team/badge/ti1upd1645219152.png')
ON CONFLICT (name, league) DO UPDATE
SET logo_url = EXCLUDED.logo_url;

-- ---------------------------------------------------------------------------
-- F. SEGURIDAD: el cron escribe vía service role key (REST directo, bypass RLS).
--    Los RPCs públicos de escritura fueron ELIMINADOS (vector de manipulación de
--    puntos/resultados con la anon key). delete_user_account queda para usuarios
--    autenticados y handle_new_user como trigger interno.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
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

  DELETE FROM public.prediction_scorers
  WHERE prediction_id IN (
    SELECT id FROM public.predictions WHERE user_id = v_user_id
  );

  DELETE FROM public.predictions WHERE user_id = v_user_id;
  DELETE FROM public.tournament_survivors WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- G. app_meta (clave-valor) para marcas del cron (hash de calendario, etc.)
-- Solo accesible por service role (bypass RLS): sin grants directos para anon/authenticated.

CREATE TABLE IF NOT EXISTS public.app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_meta ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_meta FROM anon, authenticated;
