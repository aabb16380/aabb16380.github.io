-- 修复 admin_login：pgcrypto 装在 extensions schema，需要把它加入 search_path
create or replace function public.admin_login(p_key text)
returns uuid
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_hash  text := encode(digest(p_key, 'sha256'), 'hex');
  v_token uuid;
begin
  if not exists (
    select 1 from public.admin_keys where key_hash = v_hash and enabled
  ) then
    return null;
  end if;

  insert into public.admin_sessions (key_hash, expires_at)
  values (v_hash, now() + interval '24 hours')
  returning token into v_token;

  return v_token;
end;
$$;

grant execute on function public.admin_login(text) to anon;