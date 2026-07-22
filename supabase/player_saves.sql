-- 昵称 + 密码存档（在 Supabase SQL Editor 中执行一次）
-- 客户端通过 RPC 访问，表本身不对 anon 开放直连。

create table if not exists public.player_saves (
  nickname text primary key,
  pin_hash text not null,
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

-- 不建直连 policy：anon / authenticated 不能 select/insert/update 表

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
begin
  if nick is null or char_length(nick) < 1 then
    return jsonb_build_object('status', 'bad_pin');
  end if;

  select pin_hash into row_pin from public.player_saves where nickname = nick;

  if not found then
    insert into public.player_saves (nickname, pin_hash, save_data, updated_at)
    values (nick, p_pin_hash, coalesce(p_save, '{}'::jsonb), now());
    return jsonb_build_object('status', 'ok', 'created', true, 'save', coalesce(p_save, '{}'::jsonb));
  end if;

  if row_pin is distinct from p_pin_hash then
    return jsonb_build_object('status', 'bad_pin');
  end if;

  update public.player_saves
  set save_data = coalesce(p_save, save_data),
      updated_at = now()
  where nickname = nick;

  return jsonb_build_object('status', 'ok', 'created', false, 'save', coalesce(p_save, '{}'::jsonb));
end;
$$;

grant execute on function public.account_fetch_save(text, text) to anon, authenticated;
grant execute on function public.account_upsert_save(text, text, jsonb) to anon, authenticated;
