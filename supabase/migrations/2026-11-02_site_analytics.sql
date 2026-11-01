-- Estadísticas de tráfico del sitio (Cloudflare: zona + Web Analytics RUM).
--
-- El panel de admin es un export estático: NO puede llamar a la API de Cloudflare
-- desde el navegador (la API token sería pública). Por eso un cron de GitHub
-- Actions (`.github/workflows/sync-site-analytics.yml` → `scripts/sync-site-analytics.mjs`)
-- consulta la API con el token guardado como secret y deja los agregados aquí.
-- El panel solo lee vía la RPC `admin_site_stats()`.
--
-- Privacidad: son agregados por día, sin IP ni user agent individual.

create table if not exists public.site_stats_daily (
  day            date primary key,
  requests       bigint  not null default 0,  -- peticiones HTTP (incluye bots/crawlers)
  page_views     bigint  not null default 0,  -- vistas según la zona (incluye no-humanos)
  uniques        integer not null default 0,  -- visitantes únicos/día (zona)
  bytes          bigint  not null default 0,
  cached_bytes   bigint  not null default 0,
  threats        integer not null default 0,
  rum_pageviews  integer not null default 0,  -- Web Analytics: páginas vistas por navegadores reales
  rum_visits     integer not null default 0,  -- Web Analytics: visitas reales
  updated_at     timestamptz not null default now()
);

comment on table public.site_stats_daily is
  'Agregados diarios de tráfico (Cloudflare). Escrito por el cron con service_role; sin acceso público.';

create table if not exists public.site_stats_breakdown (
  day  date not null,
  kind text not null check (kind in ('path', 'country', 'referer', 'browser')),
  key  text not null check (char_length(key) between 1 and 300),
  hits integer not null default 0,
  primary key (day, kind, key)
);

comment on table public.site_stats_breakdown is
  'Top rutas / países / referentes / navegadores por día (Web Analytics). Solo agregados.';

create index if not exists site_stats_breakdown_kind_day_idx
  on public.site_stats_breakdown (kind, day desc);

alter table public.site_stats_daily enable row level security;
alter table public.site_stats_breakdown enable row level security;

-- Sin policies a propósito: anon/authenticated no leen estas tablas en claro.
-- El service_role (cron) las escribe porque bypassa RLS.

-- ---------------------------------------------------------------------------
-- RPC del panel
-- ---------------------------------------------------------------------------
create or replace function public.admin_site_stats(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_from date := (current_date - (v_days - 1));
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores pueden ver las estadísticas del sitio';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'window_days', v_days,
    'last_sync', (select max(updated_at) from site_stats_daily),
    'totals', coalesce((
      select jsonb_build_object(
        'requests', coalesce(sum(requests), 0),
        'page_views', coalesce(sum(page_views), 0),
        'uniques_avg', coalesce(round(avg(nullif(uniques, 0))), 0),
        'uniques_max', coalesce(max(uniques), 0),
        'bytes', coalesce(sum(bytes), 0),
        'threats', coalesce(sum(threats), 0),
        'rum_pageviews', coalesce(sum(rum_pageviews), 0),
        'rum_visits', coalesce(sum(rum_visits), 0)
      ) from site_stats_daily where day >= v_from
    ), '{}'::jsonb),
    'yesterday', coalesce((
      select jsonb_build_object(
        'day', day,
        'rum_pageviews', rum_pageviews,
        'rum_visits', rum_visits,
        'page_views', page_views,
        'uniques', uniques,
        'requests', requests
      ) from site_stats_daily
      where day < current_date
      order by day desc
      limit 1
    ), '{}'::jsonb),
    'daily', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'date', day,
          'rum_pageviews', rum_pageviews,
          'rum_visits', rum_visits,
          'page_views', page_views,
          'uniques', uniques
        ) order by day
      ) from site_stats_daily where day >= v_from
    ), '[]'::jsonb),
    'top_paths', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'hits', n) order by n desc, key)
      from (
        select key, sum(hits)::int as n
        from site_stats_breakdown
        where kind = 'path' and day >= v_from
        group by key
        order by n desc, key
        limit 8
      ) p
    ), '[]'::jsonb),
    'top_countries', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'hits', n) order by n desc, key)
      from (
        select key, sum(hits)::int as n
        from site_stats_breakdown
        where kind = 'country' and day >= v_from
        group by key
        order by n desc, key
        limit 6
      ) c
    ), '[]'::jsonb),
    'top_referers', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'hits', n) order by n desc, key)
      from (
        select key, sum(hits)::int as n
        from site_stats_breakdown
        where kind = 'referer' and day >= v_from
        group by key
        order by n desc, key
        limit 6
      ) r
    ), '[]'::jsonb),
    'top_browsers', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'hits', n) order by n desc, key)
      from (
        select key, sum(hits)::int as n
        from site_stats_breakdown
        where kind = 'browser' and day >= v_from
        group by key
        order by n desc, key
        limit 5
      ) b
    ), '[]'::jsonb)
  ) into v;

  return v;
end;
$$;

revoke all on function public.admin_site_stats(integer) from public;
grant execute on function public.admin_site_stats(integer) to authenticated;
