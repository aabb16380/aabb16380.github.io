-- 让「新加的文章」自动拥有阅读统计
-- 做法：bump_views 改成「有记录就 +1，没记录就用文章信息建一行再 +1」
-- 注意：函数参数变了，先删旧版本

drop function if exists public.bump_views(text);

create or replace function public.bump_views(
  p_slug    text,
  p_title   text default null,
  p_cat     text default null,
  p_date    date default null,
  p_excerpt text default null,
  p_byline  text default null,
  p_body    text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v integer;
begin
  insert into public.posts (slug, cat, title, date, excerpt, byline, body, views, published)
  values (
    p_slug,
    coalesce(nullif(p_cat, ''), 'other'),
    coalesce(p_title, p_slug),
    p_date,
    p_excerpt,
    p_byline,
    p_body,
    1,
    true
  )
  on conflict (slug) do update set views = public.posts.views + 1
  returning views into v;

  return coalesce(v, 0);
end;
$$;

grant execute on function public.bump_views(text, text, text, date, text, text, text) to anon;
