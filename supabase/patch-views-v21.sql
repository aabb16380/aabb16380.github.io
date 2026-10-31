-- v2.1 阅读计数：文章 views 字段 + 自增 / 管理员改写
alter table public.posts add column if not exists views integer not null default 0;

-- 打开文章时 +1，返回最新值
create or replace function public.bump_views(p_slug text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v integer;
begin
  update public.posts set views = views + 1 where slug = p_slug returning views into v;
  return coalesce(v, 0);
end;
$$;

-- 管理员直接设定阅读数
create or replace function public.admin_set_views(p_token uuid, p_slug text, p_views integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v integer;
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  update public.posts set views = greatest(0, coalesce(p_views, 0)) where slug = p_slug returning views into v;
  return coalesce(v, 0);
end;
$$;

grant execute on function public.bump_views(text) to anon;
grant execute on function public.admin_set_views(uuid, text, integer) to anon;
