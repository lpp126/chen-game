import { create } from 'zustand';
import { LEVELS } from '../data/levels';
import {
  createEmptySaveData,
  loadAccountSession,
  loginOrRegisterAccount,
  logoutAccountSession,
  mergeSaveData,
  normalizeBirthdayWish,
  pullAccountSave,
  pushAccountSave,
  slotForNickname,
  type SaveData as AccountSaveData
} from '../services/accountSave';

export type PageStatus = 'home' | 'level_select' | 'level_intro' | 'start' | 'playing' | 'gameover' | 'orange_shop';

export interface GameStats {
  perfect: number;
  good: number;
  oops: number;
  total: number;
  totalNotesSpawned: number;
}

interface LevelRecord {
  stars: number;
  bestOrange: number;
  completed: boolean;
}

export interface SaveData {
  totalOranges: number;
  unlockedLevels: number[];
  levels: Record<string, LevelRecord>;
  unlockedItems: string[];
  birthdayWish?: string;
}

const PLAYER_KEY_BASE = 'ctxiang_player_data';
const PLAYER_SLOT_KEY = 'ctxiang_player_slot';
const ADMIN_KEY = 'ctxiang_admin_data';
const ADMIN_SESSION_KEY = 'ctxiang_admin_session';

const playerKeyOf = (slot: string) => `${PLAYER_KEY_BASE}:${slot}`;

const resolvePlayerSlot = (): string => {
  const session = loadAccountSession();
  if (session?.slot) {
    localStorage.setItem(PLAYER_SLOT_KEY, session.slot);
    return session.slot;
  }
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('pid') ?? params.get('player') ?? params.get('uid');
  if (fromUrl) {
    localStorage.setItem(PLAYER_SLOT_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(PLAYER_SLOT_KEY) ?? 'default';
};

const emptyStats = (): GameStats => ({
  perfect: 0,
  good: 0,
  oops: 0,
  total: 0,
  totalNotesSpawned: 0
});

const buildDefaultSave = (): SaveData => {
  const levels: Record<string, LevelRecord> = {};
  for (const level of LEVELS) {
    levels[String(level.levelId)] = { stars: 0, bestOrange: 0, completed: false };
  }
  return {
    totalOranges: 0,
    unlockedLevels: [1],
    levels,
    unlockedItems: []
  };
};

const normalizeSaveDataToStarOranges = (input: SaveData): SaveData => {
  const base = buildDefaultSave();
  const mergedLevels: Record<string, LevelRecord> = { ...base.levels, ...(input.levels ?? {}) };
  const normalizedLevels: Record<string, LevelRecord> = {};
  let totalStarOranges = 0;
  Object.entries(mergedLevels).forEach(([key, value]) => {
    const starValue = Math.max(0, value?.stars ?? 0);
    normalizedLevels[key] = {
      stars: starValue,
      bestOrange: starValue,
      completed: Boolean(value?.completed)
    };
    totalStarOranges += starValue;
  });
  const birthdayWish = normalizeBirthdayWish(input.birthdayWish ?? '');
  return {
    totalOranges: totalStarOranges,
    unlockedLevels: Array.isArray(input.unlockedLevels) && input.unlockedLevels.length > 0 ? input.unlockedLevels : [1],
    levels: normalizedLevels,
    unlockedItems: Array.isArray(input.unlockedItems) ? input.unlockedItems : [],
    ...(birthdayWish ? { birthdayWish } : {})
  };
};

const safeLoad = (key: string): SaveData => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return buildDefaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    return normalizeSaveDataToStarOranges(parsed);
  } catch {
    return buildDefaultSave();
  }
};

const safeSave = (key: string, data: SaveData) => {
  localStorage.setItem(key, JSON.stringify(data));
};

interface GameState {
  status: PageStatus;
  currentLevelId: number;
  gameplayPaused: boolean;
  runId: number;
  level1HudHeight: number;
  adminMode: boolean;
  showAdminLogin: boolean;
  adminExitCount: number;

  saveData: SaveData;
  fullness: number;
  notesCollected: number;
  combo: number;
  stars: number;
  stats: GameStats;

  pinkBubbles: number;
  placeholderProgress: number;
  playerSlot: string;
  accountNickname: string | null;

  goHome: () => void;
  goLevelSelect: () => void;
  goOrangeShop: () => void;
  enterLevelStart: (levelId: number) => void;
  proceedToStartScreen: () => void;
  startGame: () => void;
  restartCurrentLevel: () => void;
  setGameplayPaused: (paused: boolean) => void;
  setLevel1HudHeight: (height: number) => void;

  showAdminLoginModal: (show: boolean) => void;
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;
  syncAdminToPlayer: () => void;

  unlockAllLevels: () => void;
  resetCurrentModeData: () => void;

  recordHit: (type: 'perfect' | 'good' | 'oops') => void;
  spawnNoteDrop: () => void;
  collectNoteDrop: () => void;
  setPlaceholderProgress: (progress: number) => void;

  testCompleteLevel: () => void;
  completeLevel: (result: { stars: number; orangesCollected: number; orangeTotal: number }) => void;
  goNextLevel: () => void;
  hydrateCloudSave: () => Promise<void>;

  loginWithNickname: (nickname: string, pin: string) => Promise<{ ok: boolean; message: string }>;
  logoutNickname: () => void;
  /** 第 24 关结算祝福：本机保存并尽量同步云端 */
  saveBirthdayWish: (text: string) => Promise<{ ok: boolean; message: string; syncedCloud: boolean }>;
}

export const useGameStore = create<GameState>((set, get) => {
  const initialSession = loadAccountSession();
  const playerSlot = resolvePlayerSlot();
  const PLAYER_KEY = playerKeyOf(playerSlot);
  const playerData = safeLoad(PLAYER_KEY);
  const sessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
  const parsedSession = sessionRaw ? JSON.parse(sessionRaw) : { active: false, exitCount: 0 };
  const adminMode = Boolean(parsedSession.active);
  const adminData = safeLoad(ADMIN_KEY);

  const persistCurrentMode = (state: GameState, overrideData?: SaveData) => {
    const data = overrideData ?? state.saveData;
    if (state.adminMode) {
      safeSave(ADMIN_KEY, data);
      return;
    }
    // 登录态下强制写入该昵称槽，避免串到 default / 其他账号
    const slot = state.accountNickname ? slotForNickname(state.accountNickname) : state.playerSlot;
    safeSave(playerKeyOf(slot), data);
    if (state.accountNickname) {
      void pushAccountSave(data as AccountSaveData).catch(() => undefined);
    }
  };

  return {
    status: 'home',
    currentLevelId: 1,
    gameplayPaused: false,
    runId: 0,
    level1HudHeight: 188,
    adminMode,
    showAdminLogin: false,
    adminExitCount: parsedSession.exitCount ?? 0,
    saveData: adminMode ? adminData : playerData,
    fullness: 0,
    notesCollected: 0,
    combo: 0,
    stars: 0,
    stats: emptyStats(),
    pinkBubbles: 0,
    placeholderProgress: 0,
    playerSlot,
    accountNickname: initialSession?.nickname ?? null,

    goHome: () => set({ status: 'home', gameplayPaused: false }),
    goLevelSelect: () => set({ status: 'level_select', gameplayPaused: false }),
    goOrangeShop: () => set({ status: 'orange_shop', gameplayPaused: false }),
    enterLevelStart: (levelId) => set({ status: 'level_intro', currentLevelId: levelId, gameplayPaused: false }),
    proceedToStartScreen: () => set({ status: 'start', gameplayPaused: false }),
    startGame: () =>
      set((state) => ({
        status: 'playing',
        runId: state.runId + 1,
        fullness: 0,
        notesCollected: 0,
        combo: 0,
        stars: 0,
        stats: emptyStats(),
        pinkBubbles: 0,
        placeholderProgress: 0,
        gameplayPaused: false
      })),
    restartCurrentLevel: () => get().startGame(),
    setGameplayPaused: (paused) => set({ gameplayPaused: paused }),
    setLevel1HudHeight: (height) => {
      if (height > 0) set({ level1HudHeight: height });
    },

    showAdminLoginModal: (show) => set({ showAdminLogin: show }),
    loginAdmin: (username, password) => {
      if (username !== 'admin' || password !== 'ctx2026') {
        return false;
      }
      const adminSave = safeLoad(ADMIN_KEY);
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ active: true, exitCount: 0 }));
      set({
        adminMode: true,
        adminExitCount: 0,
        saveData: adminSave,
        showAdminLogin: false
      });
      return true;
    },
    logoutAdmin: () => {
      const nextExitCount = get().adminExitCount + 1;
      const shouldClearSession = nextExitCount >= 3;
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ active: false, exitCount: shouldClearSession ? 0 : nextExitCount }));
      const slot = get().playerSlot;
      set({
        adminMode: false,
        adminExitCount: shouldClearSession ? 0 : nextExitCount,
        saveData: safeLoad(playerKeyOf(slot)),
        status: 'level_select'
      });
    },
    syncAdminToPlayer: () => {
      const state = get();
      if (!state.adminMode) return;
      safeSave(playerKeyOf(state.playerSlot), state.saveData);
    },

    unlockAllLevels: () =>
      set((state) => {
        const nextData: SaveData = {
          ...state.saveData,
          unlockedLevels: LEVELS.map((l) => l.levelId)
        };
        persistCurrentMode({ ...state, saveData: nextData } as GameState, nextData);
        return { saveData: nextData };
      }),
    resetCurrentModeData: () =>
      set((state) => {
        const nextData = buildDefaultSave();
        persistCurrentMode({ ...state, saveData: nextData } as GameState, nextData);
        return { saveData: nextData, status: 'level_select' };
      }),

    recordHit: (type) =>
      set((state) => {
        if (state.status !== 'playing') return state;
        let newFullness = state.fullness;
        let newCombo = state.combo;
        if (type === 'perfect' || type === 'good') {
          newFullness = Math.min(100, state.fullness + 2);
          newCombo += 1;
        } else {
          newFullness = state.fullness;
          newCombo = 0;
        }
        const stats = { ...state.stats, [type]: state.stats[type] + 1, total: state.stats.total + 1 };
        let status: PageStatus = state.status;
        if (newFullness >= 100) status = 'gameover';
        return { fullness: newFullness, combo: newCombo, stats, status };
      }),
    spawnNoteDrop: () => set((state) => ({ stats: { ...state.stats, totalNotesSpawned: state.stats.totalNotesSpawned + 1 } })),
    collectNoteDrop: () =>
      set((state) => {
        if (state.status !== 'playing') return state;
        const notesCollected = state.notesCollected + 1;
        const pinkBubbles = state.pinkBubbles + 1;
        return { notesCollected, pinkBubbles };
      }),
    setPlaceholderProgress: (progress) =>
      set((state) => {
        const next = Math.min(100, Math.max(progress, 0));
        if (next >= 100 && state.status === 'playing') {
          return { placeholderProgress: 100, status: 'gameover', stars: 2 };
        }
        return { placeholderProgress: next };
      }),
    testCompleteLevel: () => {
      get().completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 });
    },
    completeLevel: ({ stars, orangesCollected: _orangesCollected, orangeTotal: _orangeTotal }) =>
      set((state) => {
        const levelKey = String(state.currentLevelId);
        const prev = state.saveData.levels[levelKey] ?? { stars: 0, bestOrange: 0, completed: false };
        const orangeByStars = Math.max(prev.bestOrange, stars);
        const updatedLevel: LevelRecord = {
          stars: Math.max(prev.stars, stars),
          bestOrange: orangeByStars,
          completed: true
        };
        const unlocked = new Set(state.saveData.unlockedLevels);
        unlocked.add(state.currentLevelId);
        if (state.currentLevelId < LEVELS.length) unlocked.add(state.currentLevelId + 1);
        const nextData: SaveData = {
          ...state.saveData,
          totalOranges: 0,
          unlockedLevels: [...unlocked].sort((a, b) => a - b),
          levels: { ...state.saveData.levels, [levelKey]: updatedLevel }
        };
        nextData.totalOranges = Object.values(nextData.levels).reduce((acc, lv) => acc + (lv.stars ?? 0), 0);
        persistCurrentMode({ ...state, saveData: nextData } as GameState, nextData);
        return {
          saveData: nextData,
          status: 'gameover',
          gameplayPaused: false,
          stars
        };
      }),
    goNextLevel: () =>
      set((state) => {
        if (state.currentLevelId >= LEVELS.length) {
          return { status: 'level_select', gameplayPaused: false };
        }
        return { currentLevelId: state.currentLevelId + 1, status: 'level_intro', gameplayPaused: false };
      }),

    hydrateCloudSave: async () => {
      const state = get();
      if (state.adminMode || !state.accountNickname) return;
      // 只同步当前登录昵称对应槽，绝不碰其他账号
      const slot = slotForNickname(state.accountNickname);
      if (state.playerSlot !== slot) {
        localStorage.setItem(PLAYER_SLOT_KEY, slot);
      }
      try {
        const cloud = await pullAccountSave();
        if (!cloud) return;
        const nickLocal = safeLoad(playerKeyOf(slot));
        // 同一账号：本机缓存 ↔ 云端取并集（跨设备同步），不混入其他账号
        const merged = normalizeSaveDataToStarOranges(mergeSaveData(nickLocal, cloud));
        safeSave(playerKeyOf(slot), merged);
        set({ playerSlot: slot, saveData: merged });
        void pushAccountSave(merged).catch(() => undefined);
      } catch {
        // ignore
      }
    },

    loginWithNickname: async (nickname, pin) => {
      const targetSlot = slotForNickname(nickname);
      // 只读该昵称自己的本机缓存，禁止用游客档 / 其他账号 seed
      const nickLocalOnly = safeLoad(playerKeyOf(targetSlot));

      const result = await loginOrRegisterAccount(nickname, pin);
      if (!result.ok) {
        return { ok: false, message: result.error };
      }

      const slot = loadAccountSession()?.slot ?? targetSlot;
      let nextSave: SaveData;
      if (result.created) {
        // 新号：进度与橙子一律从 0 开始
        nextSave = normalizeSaveDataToStarOranges(createEmptySaveData());
      } else if (result.mode === 'cloud') {
        // 老号 + 云端：云端存档为准（不按设备、不混本机其他账号）
        nextSave = normalizeSaveDataToStarOranges(result.save);
      } else {
        // 老号 + 仅本机：只用该昵称槽
        nextSave = normalizeSaveDataToStarOranges(nickLocalOnly);
      }

      localStorage.setItem(PLAYER_SLOT_KEY, slot);
      safeSave(playerKeyOf(slot), nextSave);
      void pushAccountSave(nextSave).catch(() => undefined);

      set({
        playerSlot: slot,
        accountNickname: loadAccountSession()?.nickname ?? nickname.trim(),
        saveData: nextSave,
        status: 'level_select'
      });

      return { ok: true, message: result.created ? '新建存档成功' : '登录成功' };
    },

    logoutNickname: () => {
      logoutAccountSession();
      // 退出后回到空会话，避免界面残留上一账号进度
      localStorage.setItem(PLAYER_SLOT_KEY, 'default');
      const blank = normalizeSaveDataToStarOranges(createEmptySaveData());
      set({
        accountNickname: null,
        playerSlot: 'default',
        saveData: blank,
        status: 'home',
        gameplayPaused: false
      });
    },

    saveBirthdayWish: async (text) => {
      const wish = normalizeBirthdayWish(text);
      if (!wish) {
        return { ok: false, message: '先写一句想对添添说的话吧', syncedCloud: false };
      }
      const state = get();
      const nextData: SaveData = { ...state.saveData, birthdayWish: wish };
      persistCurrentMode({ ...state, saveData: nextData } as GameState, nextData);
      set({ saveData: nextData });

      if (state.adminMode) {
        return { ok: true, message: '已保存（管理员模式，未上云）', syncedCloud: false };
      }
      if (!state.accountNickname) {
        return { ok: true, message: '已保存在本机；登录账号后会同步到云端', syncedCloud: false };
      }
      try {
        await pushAccountSave(nextData as AccountSaveData);
        return { ok: true, message: '已同步到云端祝福墙', syncedCloud: true };
      } catch {
        return { ok: true, message: '已保存在本机，云端稍后重试', syncedCloud: false };
      }
    }
  };
});
