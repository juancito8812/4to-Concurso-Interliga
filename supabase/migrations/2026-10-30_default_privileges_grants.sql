-- ============================================================================
-- 2026-10-30 — Grants por defecto para TABLAS NUEVAS del schema public
--
-- Contexto: Supabase deja de otorgar acceso automático por Data API
-- (PostgREST / supabase-js / GraphQL) a las tablas creadas en `public` a
-- partir del 30 de octubre de 2026. Las tablas existentes conservan sus
-- permisos; las nuevas nacen SIN grants y el cliente recibe:
--     42501  permission denied for table <tabla>   (HTTP 403)
-- incluso si la RLS está abierta.
--
-- Esta migración restablece el comportamiento anterior vía DEFAULT PRIVILEGES,
-- de modo que cualquier tabla que creen las migraciones futuras (rol `postgres`)
-- herede los permisos sin que nadie tenga que acordarse.
--
-- ⚠️ GRANT ≠ RLS. Son dos capas independientes:
--      sin GRANT          → 403 para todos los roles.
--      con GRANT + RLS ON → 0 filas hasta que una policy lo permita.
--   Toda tabla nueva DEBE seguir naciendo con:
--      alter table public.<tabla> enable row level security;
--   ...y sus políticas explícitas. Estos grants NO abren filas por sí solos.
--
-- Criterio de mínimo privilegio (alineado con el hardening del 2026-10-17):
--   * anon          → solo SELECT. La lectura pública ya está acotada por RLS
--                     (anti-copia). Ninguna tabla actual necesita escritura
--                     anónima; si alguna la necesitara, se otorga explícitamente
--                     en su propia migración, nunca por defecto.
--   * authenticated → SELECT/INSERT/UPDATE/DELETE (siempre filtrado por RLS).
--   * service_role  → SELECT/INSERT/UPDATE/DELETE (los crons y el service role
--                     no pasan por RLS; se le mantiene el acceso total a filas).
--   * TRUNCATE/REFERENCES/TRIGGER quedan fuera: no pasan por RLS y ya están
--     revocados en las tablas existentes (defensa en profundidad).
--
-- ⚠️ CINTURÓN Y TIRANTES. Este ALTER DEFAULT PRIVILEGES vive en la ACL por
-- defecto del rol `postgres` en `public`, que es la MISMA entrada que Supabase
-- tocó al introducir el cambio: si su migración del 30-oct revoca esa ACL,
-- puede arrastrar también estos grants. Por eso la regla del repo es doble:
--   1) esta red de seguridad, y
--   2) `grant` explícito en cada migración que cree tablas, justo después del
--      `create table` (ver plantilla al final del archivo).
--===========================================================================

-- Tablas nuevas
alter default privileges for role postgres in schema public
  grant select on tables to anon;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

-- Secuencias nuevas (serial / identity usados por las tablas nuevas)
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;

-- Funciones nuevas (RPCs). Las SECURITY DEFINER siguen requiriendo revisión
-- manual: solo se exponen a anon si la RPC está pensada para el público.
alter default privileges for role postgres in schema public
  grant execute on functions to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verificación (solo lectura). Debe devolver 0 filas.
-- Cualquier tabla listada aquí es inaccesible por Data API para ese rol.
-- ---------------------------------------------------------------------------
do $$
declare
  faltantes text;
begin
  select string_agg(t || ' [' || r || ']', ', ')
    into faltantes
  from (
    select c.relname as t, r.rol as r
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) as r(rol)
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1
        from information_schema.role_table_grants g
        where g.table_schema = 'public'
          and g.table_name = c.relname
          and g.grantee = r.rol
          and g.privilege_type = 'SELECT'
      )
  ) s;

  if faltantes is not null then
    raise warning 'Tablas sin GRANT SELECT (revisar): %', faltantes;
  else
    raise notice 'OK: todas las tablas de public tienen GRANT SELECT para anon y authenticated.';
  end if;
end $$;

-- Nota operativa para el flujo local: `supabase db reset` aplica las migraciones
-- como `postgres`, así que también hereda estos default privileges. Si en el
-- futuro una migración crea objetos con otro rol (p.ej. `supabase_admin`),
-- hay que repetir los `alter default privileges for role <ese_rol>`.

-- ============================================================================
-- PLANTILLA OBLIGATORIA para toda migración que cree una tabla en `public`
-- (copiar y ajustar; la RLS y sus políticas NO son opcionales)
-- ============================================================================
-- create table public.<tabla> (...);
--
-- alter table public.<tabla> enable row level security;
--
-- -- Lectura pública solo si la tabla debe ser legible por anon:
-- grant select on public.<tabla> to anon;
-- grant select, insert, update, delete on public.<tabla> to authenticated;
-- grant select, insert, update, delete on public.<tabla> to service_role;
--
-- -- Nunca por defecto (no pasan por RLS):
-- revoke truncate, references, trigger on public.<tabla> from anon, authenticated;
--
-- -- Secuencias propias (serial/identity) si aplica:
-- grant usage, select on sequence public.<tabla>_id_seq to authenticated, service_role;
--
-- -- Políticas RLS, p.ej.:
-- create policy "<tabla>_select_publicas" on public.<tabla>
--   for select to anon using (<condición>);
-- ============================================================================
