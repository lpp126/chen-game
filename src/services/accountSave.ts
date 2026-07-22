/** 昵称 + 密码存档（本机分档；配置 Supabase 后可跨设备） */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type LevelRecord = {
  stars: number;
  bestOrange: number;
  completed: boolean;
};

export type SaveData = {
  totalOranges: number;
  unlockedLevels: number[];
  levels: Record<string, LevelRecord>;
  unlockedItems: string[];
};

export type AccountSession = {
  nickname: string;
  pinHash: string;
  slot: string;
};

const SESSION_KEY = 'ctxiang_account_session';
const PIN_KEY_PREFIX = 'ctxiang_pin:';
const SALT = 'ctxiang-v1';

let supabase: SupabaseClient | null | undefined;

export const normalizeNickname = (raw: string) => raw.trim().replace(/\s+/g, ' ');

/** 按「字」计数（中文/emoji/符号各算 1） */
export const countNicknameChars = (text: string) => {
  try {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
  } catch {
    return Array.from(text).length;
  }
};

export const nicknameKey = (nickname: string) => normalizeNickname(nickname).toLowerCase();

export const slotForNickname = (nickname: string) => `nick:${nicknameKey(nickname)}`;

export const isValidNickname = (nickname: string) => {
  const n = normalizeNickname(nickname);
  if (!n) return false;
  const len = countNicknameChars(n);
  return len >= 1 && len <= 12;
};

export const isValidPin = (pin: string) => /^[0-9A-Za-z]{4,8}$/.test(pin);

export async function hashPin(nickname: string, pin: string): Promise<string> {
  const payload = `${SALT}:${nicknameKey(nickname)}:${pin}`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const loadAccountSession = (): AccountSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountSession;
    if (!parsed?.nickname || !parsed?.pinHash || !parsed?.slot) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const saveAccountSession = (session: AccountSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const rememberLocalPinHash = (nickname: string, pinHash: string) => {
  localStorage.setItem(`${PIN_KEY_PREFIX}${nicknameKey(nickname)}`, pinHash);
};

export const readLocalPinHash = (nickname: string): string | null =>
  localStorage.getItem(`${PIN_KEY_PREFIX}${nicknameKey(nickname)}`);

export const isCloudConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && key);
};

const getSupabase = (): SupabaseClient | null => {
  if (supabase !== undefined) return supabase;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    supabase = null;
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
};

/** 空存档：新账号一律从这里开始，不继承设备上其他账号/游客进度 */
export const createEmptySaveData = (): SaveData => ({
  totalOranges: 0,
  unlockedLevels: [1],
  levels: {},
  unlockedItems: []
});

/** 仅合并「同一账号」的两端进度（如本机缓存 ↔ 云端），禁止跨账号混用 */
export const mergeSaveData = (a: SaveData, b: SaveData): SaveData => {
  const levelIds = new Set([...Object.keys(a.levels ?? {}), ...Object.keys(b.levels ?? {})]);
  const levels: Record<string, LevelRecord> = {};
  levelIds.forEach((id) => {
    const la = a.levels?.[id];
    const lb = b.levels?.[id];
    const stars = Math.max(la?.stars ?? 0, lb?.stars ?? 0);
    levels[id] = {
      stars,
      bestOrange: stars,
      completed: Boolean(la?.completed || lb?.completed)
    };
  });
  const unlocked = [...new Set([...(a.unlockedLevels ?? [1]), ...(b.unlockedLevels ?? [1])])].sort(
    (x, y) => x - y
  );
  const totalOranges = Object.values(levels).reduce((sum, lv) => sum + (lv.stars ?? 0), 0);
  const unlockedItems = [...new Set([...(a.unlockedItems ?? []), ...(b.unlockedItems ?? [])])];
  return { totalOranges, unlockedLevels: unlocked.length ? unlocked : [1], levels, unlockedItems };
};

export type AccountActionResult =
  | { ok: true; save: SaveData; mode: 'local' | 'cloud'; created: boolean }
  | { ok: false; error: string };

type RpcFetch =
  | { status: 'ok'; save: SaveData }
  | { status: 'not_found' }
  | { status: 'bad_pin' };

type RpcUpsert =
  | { status: 'ok'; save: SaveData; created?: boolean }
  | { status: 'bad_pin' };

const NICK_TAKEN_MSG = '该昵称已被使用。若是你的账号请输入正确密码，否则请换一个昵称。';

/**
 * 登录/注册：进度只属于「昵称 + 密码」。
 * - 云端已配置：以云端存档为准；新号写入空档，不带入本机其他账号进度
 * - 未配置云端：按昵称分槽；新号空档，老号由调用方读该昵称槽
 */
export async function loginOrRegisterAccount(
  nicknameRaw: string,
  pin: string
): Promise<AccountActionResult> {
  const nickname = normalizeNickname(nicknameRaw);
  if (!isValidNickname(nickname)) {
    return { ok: false, error: '昵称需 1～12 个字，可含符号和 emoji' };
  }
  if (!isValidPin(pin)) {
    return { ok: false, error: '密码需 4～8 位字母或数字' };
  }

  const pinHash = await hashPin(nickname, pin);
  const client = getSupabase();
  const empty = createEmptySaveData();

  if (client) {
    const { data, error } = await client.rpc('account_fetch_save', {
      p_nickname: nicknameKey(nickname),
      p_pin_hash: pinHash
    });
    if (error) {
      return { ok: false, error: '暂时无法连接，请稍后再试' };
    }
    const payload = data as RpcFetch;
    if (payload?.status === 'bad_pin') {
      return { ok: false, error: NICK_TAKEN_MSG };
    }
    if (payload?.status === 'ok' && payload.save) {
      rememberLocalPinHash(nickname, pinHash);
      saveAccountSession({ nickname, pinHash, slot: slotForNickname(nickname) });
      // 云端为准，不把本机其他账号/游客进度写回去
      return { ok: true, save: payload.save as SaveData, mode: 'cloud', created: false };
    }

    // not_found → 注册空档（昵称唯一）
    const { data: upData, error: upErr } = await client.rpc('account_upsert_save', {
      p_nickname: nicknameKey(nickname),
      p_pin_hash: pinHash,
      p_save: empty
    });
    if (upErr) {
      return { ok: false, error: '创建存档失败，请稍后再试' };
    }
    const up = upData as RpcUpsert;
    if (up?.status === 'bad_pin') {
      return { ok: false, error: NICK_TAKEN_MSG };
    }
    rememberLocalPinHash(nickname, pinHash);
    saveAccountSession({ nickname, pinHash, slot: slotForNickname(nickname) });
    return { ok: true, save: empty, mode: 'cloud', created: true };
  }

  // 仅本机：按昵称分槽，新号从空档开始
  const localPin = readLocalPinHash(nickname);
  if (localPin && localPin !== pinHash) {
    return { ok: false, error: NICK_TAKEN_MSG };
  }
  const created = !localPin;
  rememberLocalPinHash(nickname, pinHash);
  saveAccountSession({ nickname, pinHash, slot: slotForNickname(nickname) });
  return { ok: true, save: empty, mode: 'local', created };
}

export async function pushAccountSave(save: SaveData): Promise<void> {
  const session = loadAccountSession();
  const client = getSupabase();
  if (!session || !client) return;
  await client.rpc('account_upsert_save', {
    p_nickname: nicknameKey(session.nickname),
    p_pin_hash: session.pinHash,
    p_save: save
  });
}

export async function pullAccountSave(): Promise<SaveData | null> {
  const session = loadAccountSession();
  const client = getSupabase();
  if (!session || !client) return null;
  const { data, error } = await client.rpc('account_fetch_save', {
    p_nickname: nicknameKey(session.nickname),
    p_pin_hash: session.pinHash
  });
  if (error) return null;
  const payload = data as RpcFetch;
  if (payload?.status !== 'ok' || !payload.save) return null;
  return payload.save as SaveData;
}

export const logoutAccountSession = () => {
  saveAccountSession(null);
};
