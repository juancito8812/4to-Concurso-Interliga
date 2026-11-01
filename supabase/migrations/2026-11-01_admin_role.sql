-- ==============================================================================
-- 2026-11-01 — Rol de administrador en `profiles`
--
-- Habilita la cuenta /admin (login + panel) sin abrir la puerta a que un
-- participante se auto-promueva: la columna `role` solo la escribe el servidor
-- (service_role / SQL directo), igual que `points`.
--
-- Reglas:
--   · `profiles.role` ∈ {user, admin}, por defecto `user`.
--   · `public.is_admin()` es SECURITY DEFINER para poder consultarse dentro de
--     las policies sin recursión (leyendo profiles desde una policy de profiles
--     provoca "infinite recursion detected").
--   · Solo `service_role` (o postgres/supabase_admin) puede cambiar `role`.
--   · Los admins pueden leer todos los `profiles` (listado de participantes).
--     NO se amplía `predictions`: la lectura de pronósticos abiertos sigue
--     enmascarada por la RPC `get_public_predictions` (regla anti-copia).
-- ==============================================================================

alter table public.profiles
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

create index if not exists idx_profiles_role on public.profiles (role) where role = 'admin';

-- Helper sin recursión de policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- `role` solo lo escribe el servidor: sin esto cualquier usuario podría
-- hacer PATCH a su propio profiles.role = 'admin' (la policy de UPDATE propio
-- ya existe) y leer todos los datos del concurso.
create or replace function public.enforce_role_service_only()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jwt_role text;
  v_is_service boolean;
begin
  v_jwt_role := coalesce((current_setting('request.jwt.claims', true)::json) ->> 'role', '');
  v_is_service := v_jwt_role = 'service_role'
    or session_user in ('postgres', 'supabase_admin', 'service_role');

  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' and not v_is_service then
      raise exception 'Solo el servidor puede asignar roles';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role and not v_is_service then
    raise exception 'Solo el servidor puede cambiar roles';
  end if;
  return new;
end $$;

drop trigger if exists trg_role_service_only on public.profiles;
create trigger trg_role_service_only
  before insert or update on public.profiles
  for each row execute function public.enforce_role_service_only();
