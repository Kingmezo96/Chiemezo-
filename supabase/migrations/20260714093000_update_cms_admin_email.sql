create or replace function public.cms_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'editor'))
    or ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin')
    or ((auth.jwt() -> 'app_metadata' -> 'roles') ? 'editor')
    or (lower(coalesce(auth.jwt() ->> 'email', '')) in ('chibuzoobonna01@gmail.com', 'shibuzoogbunaya01@gmail.com')),
    false
  );
$$;
