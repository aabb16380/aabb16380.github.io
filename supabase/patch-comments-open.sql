-- 评论改为「发即显示」：默认 approved = true，并放开插入策略的限制
alter table public.post_comments alter column approved set default true;

drop policy if exists "comments insertable" on public.post_comments;
create policy "comments insertable" on public.post_comments
  for insert
  with check (
    char_length(body) between 1 and 800
    and char_length(name) <= 20
  );

-- 防重复提交：同一篇文章、完全相同的正文，30 秒内最多 5 条，第 6 条拒绝
create or replace function public.comment_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    select count(*) from public.post_comments
    where slug = new.slug
      and body = new.body
      and created_at > now() - interval '30 seconds'
  ) >= 5 then
    raise exception 'too many identical comments';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_guard_trg on public.post_comments;
create trigger comment_guard_trg
  before insert on public.post_comments
  for each row execute function public.comment_guard();
