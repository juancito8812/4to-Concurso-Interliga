-- Alarma de "resultados pendientes" del admin basada en la hora efectiva de
-- inicio, no en la fecha cruda. football-data.org guarda 00:00:00Z cuando la TV
-- aún no confirma horario; effective_kickoff() la traduce a 20:00Z del mismo
-- día. Sin esto, un partido del domingo por la noche aparecía como "atrasado"
-- el domingo a las 03:00Z.
--
-- Complemento de scripts/sync-kickoff-times.js, que refresca match_date con la
-- hora real de ESPN para los partidos de la ventana actual.

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores pueden ver estas métricas';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'participants', (
      select jsonb_build_object(
        'total', count(*),
        'with_club', count(*) filter (where team_id is not null),
        'admins', count(*) filter (where role = 'admin'),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days')
      ) from profiles
    ),
    'predictions', (
      select jsonb_build_object(
        'total', count(*),
        'scored', count(*) filter (where points is not null),
        'last_24h', count(*) filter (where created_at > now() - interval '24 hours'),
        'last_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'last_at', max(created_at)
      ) from predictions
    ),
    'matches', (
      select jsonb_build_object(
        'total', count(*),
        'with_result', count(*) filter (where result_home is not null),
        'overdue', count(*) filter (
          where result_home is null
            and public.effective_kickoff(match_date) < now() - interval '3 hours'
            and public.effective_kickoff(match_date) > now() - interval '7 days'
        )
      ) from matches
    ),
    'survivors', (
      select jsonb_build_object(
        'alive', count(*) filter (where status = 'ALIVE'),
        'eliminated', count(*) filter (where status <> 'ALIVE'),
        'total', count(*)
      ) from tournament_survivors
    ),
    'activity_7d', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', n) order by d)
      from (
        select date_trunc('day', created_at)::date as d, count(*) as n
        from predictions
        where created_at > now() - interval '7 days'
        group by 1
      ) a
    ), '[]'::jsonb),
    'top_clubs', coalesce((
      select jsonb_agg(j order by n desc, name)
      from (
        select jsonb_build_object(
          'name', t.name,
          'league', t.league,
          'logo_url', t.logo_url,
          'count', count(*)
        ) as j,
        coalesce(t.name, '') as name,
        count(*) as n
        from profiles p
        join teams t on t.id = p.team_id
        group by t.name, t.league, t.logo_url
      ) c
    ), '[]'::jsonb),
    'cups', coalesce((
      select jsonb_agg(j order by slug)
      from (
        select tournament_slug as slug,
               jsonb_build_object(
                 'slug', tournament_slug,
                 'alive', count(*) filter (where status = 'ALIVE'),
                 'eliminated', count(*) filter (where status <> 'ALIVE'),
                 'total', count(*)
               ) as j
        from tournament_survivors
        group by tournament_slug
      ) c
    ), '[]'::jsonb)
  ) into v;

  return v;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
