-- ============================================================
-- 新增三个板块：名言 / 事迹 / 图集
-- 用法：SQL Editor → New query → 整段粘贴 → Run
-- ============================================================

-- ---------- 名言 ----------
create table if not exists public.quotes (
  id         bigserial primary key,
  body       text not null,
  sort_order integer not null default 999,
  created_at timestamptz not null default now()
);
alter table public.quotes enable row level security;
drop policy if exists "quotes readable" on public.quotes;
create policy "quotes readable" on public.quotes for select using (true);

-- ---------- 事迹 ----------
create table if not exists public.deeds (
  id          bigserial primary key,
  body        text not null,
  created_at  timestamptz not null default now(),
  score_sum   integer not null default 0,
  score_count integer not null default 0
);
alter table public.deeds enable row level security;
drop policy if exists "deeds readable" on public.deeds;
create policy "deeds readable" on public.deeds for select using (true);

-- ---------- 图集 ----------
create table if not exists public.photos (
  id          bigserial primary key,
  url         text not null,
  caption     text,
  created_at  timestamptz not null default now(),
  score_sum   integer not null default 0,
  score_count integer not null default 0
);
alter table public.photos enable row level security;
drop policy if exists "photos readable" on public.photos;
create policy "photos readable" on public.photos for select using (true);

-- ============================================================
-- 管理员：增加 / 删除
-- ============================================================
create or replace function public.admin_add_quote(p_token uuid, p_body text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  insert into public.quotes (body) values (p_body) returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_delete_quote(p_token uuid, p_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  delete from public.quotes where id = p_id;
  return true;
end $$;

create or replace function public.admin_add_deed(p_token uuid, p_body text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  insert into public.deeds (body) values (p_body) returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_delete_deed(p_token uuid, p_id bigint)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_token) then raise exception 'unauthorized'; end if;
  delete from public.deeds where id = p_id;
  return true;
end $$;

-- ============================================================
-- 评分（1–5 星，每星 2 分，即 2–10 分）
-- ============================================================
create or replace function public.rate_deed(p_id bigint, p_stars integer)
returns json language plpgsql security definer set search_path = public
as $$
declare s integer;
begin
  s := greatest(1, least(5, coalesce(p_stars, 5))) * 2;
  update public.deeds
     set score_sum = score_sum + s,
         score_count = score_count + 1
   where id = p_id;
  return (select json_build_object(
            'avg', round(score_sum::numeric / greatest(score_count, 1), 1),
            'count', score_count)
          from public.deeds where id = p_id);
end $$;

create or replace function public.rate_photo(p_id bigint, p_stars integer)
returns json language plpgsql security definer set search_path = public
as $$
declare s integer;
begin
  s := greatest(1, least(5, coalesce(p_stars, 5))) * 2;
  update public.photos
     set score_sum = score_sum + s,
         score_count = score_count + 1
   where id = p_id;
  return (select json_build_object(
            'avg', round(score_sum::numeric / greatest(score_count, 1), 1),
            'count', score_count)
          from public.photos where id = p_id);
end $$;

-- 任何人上传图片后登记一行
create or replace function public.add_photo(p_url text, p_caption text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  insert into public.photos (url, caption) values (p_url, p_caption) returning id into v_id;
  return v_id;
end $$;

-- ============================================================
-- 图片存储桶（公开读、任何人可传）
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery public read" on storage.objects;
create policy "gallery public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'gallery');

drop policy if exists "gallery anon upload" on storage.objects;
create policy "gallery anon upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'gallery');

-- ============================================================
-- 权限
-- ============================================================
grant execute on function public.admin_add_quote(uuid,text)     to anon;
grant execute on function public.admin_delete_quote(uuid,bigint) to anon;
grant execute on function public.admin_add_deed(uuid,text)      to anon;
grant execute on function public.admin_delete_deed(uuid,bigint) to anon;
grant execute on function public.rate_deed(bigint,integer)      to anon;
grant execute on function public.rate_photo(bigint,integer)     to anon;
grant execute on function public.add_photo(text,text)           to anon;

-- ============================================================
-- 初始数据
-- ============================================================
insert into public.quotes (body, sort_order)
select v.body, v.ord from (values
  ('于神扫码扫完了', 1),
  ('这王奕白也是扫码了', 2),
  ('yprakimo', 3),
  ('不对啊，你们在哪上的课', 4),
  ('我以为今天有课', 5)
) as v(body, ord)
where not exists (select 1 from public.quotes);

insert into public.deeds (body)
select v.body from (values
  ('球类传播宗教'),
  ('预赛省二'),
  ('英语99分')
) as v(body)
where not exists (select 1 from public.deeds);
