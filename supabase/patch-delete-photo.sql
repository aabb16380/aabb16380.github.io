-- 删除图集里的一张（管理员）
create or replace function public.admin_delete_photo(p_token uuid, p_id bigint)
returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  delete from public.photos where id = p_id;
  return true;
end;
$$;

grant execute on function public.admin_delete_photo(uuid, bigint) to anon;
