-- v2.7 经历（时间线）可编辑
create table if not exists public.journey (
  id         bigserial primary key,
  time_label text not null,
  title      text not null,
  body       text not null,
  sort_order integer not null default 999,
  created_at timestamptz not null default now()
);
alter table public.journey enable row level security;
drop policy if exists "journey readable" on public.journey;
create policy "journey readable" on public.journey for select using (true);

create or replace function public.admin_add_journey(p_token uuid, p_time text, p_title text, p_body text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v bigint;
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  insert into public.journey (time_label, title, body, sort_order)
  values (p_time, p_title, p_body, coalesce((select max(sort_order) + 1 from public.journey), 1))
  returning id into v;
  return v;
end $$;

create or replace function public.admin_update_journey(p_token uuid, p_id bigint, p_time text, p_title text, p_body text)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  update public.journey set time_label = p_time, title = p_title, body = p_body where id = p_id;
  return true;
end $$;

create or replace function public.admin_delete_journey(p_token uuid, p_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  delete from public.journey where id = p_id;
  return true;
end $$;

grant execute on function public.admin_add_journey(uuid,text,text,text) to anon;
grant execute on function public.admin_update_journey(uuid,bigint,text,text,text) to anon;
grant execute on function public.admin_delete_journey(uuid,bigint) to anon;

-- 把现有 7 条时间线灌进去（只在表为空时执行）
insert into public.journey (time_label, title, body, sort_order)
select v.a, v.b, v.c, v.d from (values
  ('2010', '出生', '2 月 2 日。', 1),
  ('2013', '三岁 · 高考数学满分', '还没上幼儿园，先把高考数学卷做完了，满分。', 2),
  ('2014', '四岁 · AK CMO', '中国数学奥林匹克，全场满分（AK）。', 3),
  ('2015', '五岁 · 代表地球出战 UMO', '宇宙数学奥林匹克（Universal Mathematics Olympiad）：要求在 10⁻²³ 秒内解出 10²³ 道黑题。', 4),
  ('2017', '七岁 · 宙 MO 金牌', '成为处女座星系团唯一一个获得宙金的生物。', 5),
  ('2018', '八岁 · AK UMO', '宇宙数学奥林匹克，满分（AK）。', 6),
  ('2026', '十六岁 · 无声', '拒领当年所有奖项，没有致辞，只留下一句话：「数学不需要我，是我需要它。」', 7)
) as v(a,b,c,d)
where not exists (select 1 from public.journey);