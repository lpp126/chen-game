-- 昵称 + 密码存档（在 Supabase SQL Editor 中执行）
-- 客户端通过 RPC 访问，表本身不对 anon 开放直连。
--
-- 统计 / 收集列（Table Editor 可直接查看）：
--   cleared_levels     = 已通关关卡数（通关进度）
--   total_oranges      = 累计橙子数
--   birthday_message   = 第 24 关写给添添的祝福（来自 save_data.birthdayWish）
-- 完整存档仍在 save_data jsonb；写入时自动同步上述列。

create table if not exists public.player_saves (
  nickname text primary key,
  pin_hash text not null,
  save_data jsonb not null default '{}'::jsonb,
  cleared_levels integer not null default 0,
  total_oranges integer not null default 0,
  birthday_message text,
  updated_at timestamptz not null default now()
);

-- 已有库升级：补列（可重复执行）
alter table public.player_saves
  add column if not exists cleared_levels integer not null default 0;
alter table public.player_saves
  add column if not exists total_oranges integer not null default 0;
alter table public.player_saves
  add column if not exists birthday_message text;

alter table public.player_saves enable row level security;

-- 不建直连 policy：anon / authenticated 不能 select/insert/update 表

-- 从 save_data 提取统计字段（返回类型有变更时需先 drop）
drop function if exists public._save_stats(jsonb);

create or replace function public._save_stats(p_save jsonb)
returns table (cleared_levels integer, total_oranges integer, birthday_message text)
language sql
immutable
as $$
  select
    (
      select count(*)::integer
      from jsonb_each(coalesce(p_save->'levels', '{}'::jsonb)) as e(k, v)
      where coalesce((v->>'completed')::boolean, false)
    ) as cleared_levels,
    greatest(
      0,
      coalesce((p_save->>'totalOranges')::integer, 0)
    ) as total_oranges,
    nullif(btrim(coalesce(p_save->>'birthdayWish', '')), '') as birthday_message;
$$;

create or replace function public.account_fetch_save(p_nickname text, p_pin_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_pin text;
  row_save jsonb;
begin
  if p_nickname is null or char_length(trim(p_nickname)) < 1 then
    return jsonb_build_object('status', 'not_found');
  end if;

  select pin_hash, save_data into row_pin, row_save
    from public.player_saves
   where nickname = lower(trim(p_nickname));

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if row_pin is distinct from p_pin_hash then
    return jsonb_build_object('status', 'bad_pin');
  end if;

  return jsonb_build_object('status', 'ok', 'save', row_save);
end;
$$;

create or replace function public.account_upsert_save(p_nickname text, p_pin_hash text, p_save jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nick text := lower(trim(p_nickname));
  row_pin text;
  payload jsonb := coalesce(p_save, '{}'::jsonb);
  st_cleared integer;
  st_oranges integer;
  st_wish text;
begin
  if nick is null or char_length(nick) < 1 then
    return jsonb_build_object('status', 'bad_pin');
  end if;

  select s.cleared_levels, s.total_oranges, s.birthday_message
    into st_cleared, st_oranges, st_wish
    from public._save_stats(payload) as s;

  select pin_hash into row_pin from public.player_saves where nickname = nick;

  if not found then
    insert into public.player_saves (
      nickname, pin_hash, save_data, cleared_levels, total_oranges, birthday_message, updated_at
    ) values (
      nick, p_pin_hash, payload, st_cleared, st_oranges, st_wish, now()
    );
    return jsonb_build_object('status', 'ok', 'created', true, 'save', payload);
  end if;

  if row_pin is distinct from p_pin_hash then
    return jsonb_build_object('status', 'bad_pin');
  end if;

  update public.player_saves
     set save_data = payload,
         cleared_levels = st_cleared,
         total_oranges = st_oranges,
         birthday_message = st_wish,
         updated_at = now()
   where nickname = nick;

  return jsonb_build_object('status', 'ok', 'created', false, 'save', payload);
end;
$$;

-- 回填已有行的统计列（可重复执行）
update public.player_saves p
   set cleared_levels = (
         select s.cleared_levels from public._save_stats(p.save_data) as s
       ),
       total_oranges = (
         select s.total_oranges from public._save_stats(p.save_data) as s
       ),
       birthday_message = (
         select s.birthday_message from public._save_stats(p.save_data) as s
       );

grant execute on function public.account_fetch_save(text, text) to anon, authenticated;
grant execute on function public.account_upsert_save(text, text, jsonb) to anon, authenticated;

-- 留言墙公开拉取（仅昵称 + 祝福，不含密码与完整存档）
create or replace function public.list_birthday_wishes()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'nickname', nickname,
          'message', birthday_message,
          'updatedAt', updated_at
        )
        order by updated_at desc
      )
      from public.player_saves
      where birthday_message is not null
        and btrim(birthday_message) <> ''
    ),
    '[]'::jsonb
  );
$$;

grant execute on function public.list_birthday_wishes() to anon, authenticated;

-- 橙子排行榜（前 500；同分并列，下一名跳过空位，如 5 个并列第 1 → 下一名为第 6）
create or replace function public.list_orange_leaderboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'rank', r.rank,
          'nickname', r.nickname,
          'levels', r.cleared_levels,
          'oranges', r.total_oranges
        )
        order by r.ord
      )
      from (
        select
          nickname,
          cleared_levels,
          total_oranges,
          rank() over (order by total_oranges desc) as rank,
          row_number() over (order by total_oranges desc, nickname asc) as ord
        from public.player_saves
        where total_oranges > 0
      ) as r
      where r.ord <= 500
    ),
    '[]'::jsonb
  );
$$;

grant execute on function public.list_orange_leaderboard() to anon, authenticated;

-- 查看祝福墙：
-- select nickname, birthday_message, cleared_levels, total_oranges, updated_at
--   from public.player_saves
--  where birthday_message is not null
--  order by updated_at desc;
-- 或：select * from public.list_birthday_wishes();
-- 橙子榜：select * from public.list_orange_leaderboard();
