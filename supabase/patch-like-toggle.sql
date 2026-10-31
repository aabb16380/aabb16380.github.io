-- 取消点赞：计数减一（不会减到负数）
create or replace function public.decrement_like(p_slug text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  n integer;
begin
  update public.post_likes
     set likes = greatest(likes - 1, 0)
   where slug = p_slug
  returning likes into n;

  if n is null then
    n := 0;
  end if;

  return n;
end;
$$;

grant execute on function public.decrement_like(text) to anon;
