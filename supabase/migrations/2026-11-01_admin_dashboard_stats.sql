-- Métricas agregadas del panel de administración.
-- SECURITY DEFINER: el admin necesita leer conteos de tablas que la RLS pública
-- ya no expone en claro (predictions de partidos abiertos). Solo devuelve
-- agregados, nunca filas individuales de otros usuarios.
-- Guard: public.is_admin() (SECURITY DEFINER, sin recursión de policies).

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
            and match_date < now() - interval '3 hours'
            and match_date > now() - interval '7 days'
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
