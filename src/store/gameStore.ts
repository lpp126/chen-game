import { create } from 'zustand';
import { LEVELS } from '../data/levels';

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

interface SaveData {
  totalOranges: number;
  unlockedLevels: number[];
  levels: Record<string, LevelRecord>;
  unlockedItems: string[];
}

const PLAYER_KEY_BASE = 'ctxiang_player_data';
const PLAYER_SLOT_KEY = 'ctxiang_player_slot';
const ADMIN_KEY = 'ctxiang_admin_data';
const ADMIN_SESSION_KEY = 'ctxiang_admin_session';

const resolvePlayerSlot = (): string => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('pid') ?? params.get('player') ?? params.get('uid');
  if (fromUrl) {
    localStorage.setItem(PLAYER_SLOT_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(PLAYER_SLOT_KEY) ?? 'default';
};

const normalizeCloudValue = (raw: unknown): string | null => {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const maybeValue = (raw as { value?: unknown }).value;
    if (typeof maybeValue === 'string') return maybeValue;
  }
  return null;
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

const safeLoad = (key: string): SaveData => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return buildDefaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    const base = buildDefaultSave();
    return {
      totalOranges: parsed.totalOranges ?? 0,
      unlockedLevels: Array.isArray(parsed.unlockedLevels) && parsed.unlockedLevels.length > 0 ? parsed.unlockedLevels : [1],
      levels: { ...base.levels, ...(parsed.levels ?? {}) },
      unlockedItems: Array.isArray((parsed as SaveData).unlockedItems) ? (parsed as SaveData).unlockedItems : []
    };
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
  adminMode: boolean;
  showAdminLogin: boolean;
  adminExitCount: number;

  saveData: SaveData;
  fullness: number;
  notesCollected: number;
  combo: number;
  stars: number;
  stats: GameStats;

  runOranges: number;
  runOrangeTotal: number;
  pinkBubbles: number;
  placeholderProgress: number;
  playerSlot: string;

  goHome: () => void;
  goLevelSelect: () => void;
  goOrangeShop: () => void;
  enterLevelStart: (levelId: number) => void;
  proceedToStartScreen: () => void;
  startGame: () => void;
  restartCurrentLevel: () => void;
  setGameplayPaused: (paused: boolean) => void;

  showAdminLoginModal: (show: boolean) => void;
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;
  syncAdminToPlayer: () => void;

  unlockAllLevels: () => void;
  resetCurrentModeData: () => void;

  recordHit: (type: 'perfect' | 'good' | 'oops') => void;
  spawnNoteDrop: () => void;
  collectNoteDrop: () => void;
  addRunOrange: (count?: number) => void;
  setRunOrangeTotal: (total: number) => void;
  setPlaceholderProgress: (progress: number) => void;

  testCompleteLevel: () => void;
  completeLevel: (result: { stars: number; orangesCollected: number; orangeTotal: number }) => void;
  goNextLevel: () => void;
  hydrateCloudSave: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => {
  const playerSlot = resolvePlayerSlot();
  const PLAYER_KEY = `${PLAYER_KEY_BASE}:${playerSlot}`;
  const playerData = safeLoad(PLAYER_KEY);
  const sessionRaw = localStorage.getItem(ADMIN_SESSION_KEY);
  const parsedSession = sessionRaw ? JSON.parse(sessionRaw) : { active: false, exitCount: 0 };
  const adminMode = Boolean(parsedSession.active);
  const adminData = safeLoad(ADMIN_KEY);

  const persistCurrentMode = (state: GameState, overrideData?: SaveData) => {
    const data = overrideData ?? state.saveData;
    const key = state.adminMode ? ADMIN_KEY : PLAYER_KEY;
    safeSave(key, data);
    if (!state.adminMode && window.puter?.kv) {
      void window.puter.kv.set(key, JSON.stringify(data)).catch(() => undefined);
    }
  };

  return {
    status: 'home',
    currentLevelId: 1,
    gameplayPaused: false,
    adminMode,
    showAdminLogin: false,
    adminExitCount: parsedSession.exitCount ?? 0,
    saveData: adminMode ? adminData : playerData,
    fullness: 0,
    notesCollected: 0,
    combo: 0,
    stars: 0,
    stats: emptyStats(),
    runOranges: 0,
    runOrangeTotal: 0,
    pinkBubbles: 0,
    placeholderProgress: 0,
    playerSlot,

    goHome: () => set({ status: 'home', gameplayPaused: false }),
    goLevelSelect: () => set({ status: 'level_select', gameplayPaused: false }),
    goOrangeShop: () => set({ status: 'orange_shop', gameplayPaused: false }),
    enterLevelStart: (levelId) => set({ status: 'level_intro', currentLevelId: levelId, gameplayPaused: false }),
    proceedToStartScreen: () => set({ status: 'start', gameplayPaused: false }),
    startGame: () =>
      set({
        status: 'playing',
        fullness: 0,
        notesCollected: 0,
        combo: 0,
        stars: 0,
        stats: emptyStats(),
        runOranges: 0,
        runOrangeTotal: 0,
        pinkBubbles: 0,
        placeholderProgress: 0,
        gameplayPaused: false
      }),
    restartCurrentLevel: () => get().startGame(),
    setGameplayPaused: (paused) => set({ gameplayPaused: paused }),

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
      set({
        adminMode: false,
        adminExitCount: shouldClearSession ? 0 : nextExitCount,
        saveData: safeLoad(PLAYER_KEY),
        status: 'level_select'
      });
    },
    syncAdminToPlayer: () => {
      const state = get();
      if (!state.adminMode) return;
      safeSave(PLAYER_KEY, state.saveData);
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
        if (type === 'perfect') {
          newFullness = Math.min(100, state.fullness + 2);
          newCombo += 1;
        } else if (type === 'good') {
          newFullness = Math.min(100, state.fullness + 1);
          newCombo += 1;
        } else {
          newFullness = Math.max(0, state.fullness - 1);
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
        let runOranges = state.runOranges;
        let fullness = state.fullness;
        if (pinkBubbles % 10 === 0) {
          runOranges += 1;
          fullness = Math.min(100, state.fullness + 5);
        }
        return { notesCollected, pinkBubbles, runOranges, fullness };
      }),
    addRunOrange: (count = 1) =>
      set((state) => ({
        runOranges: state.runOranges + count
      })),
    setRunOrangeTotal: (total) => set({ runOrangeTotal: total }),
    setPlaceholderProgress: (progress) =>
      set((state) => {
        const next = Math.min(100, Math.max(progress, 0));
        if (next >= 100 && state.status === 'playing') {
          return { placeholderProgress: 100, status: 'gameover', stars: 2 };
        }
        return { placeholderProgress: next };
      }),
    testCompleteLevel: () => {
      const state = get();
      const levelCfg = LEVELS.find((l) => l.levelId === state.currentLevelId);
      const allOranges = levelCfg ? levelCfg.orangeSpawnConfig.max : 10;
      get().completeLevel({ stars: 3, orangesCollected: allOranges, orangeTotal: allOranges });
    },
    completeLevel: ({ stars, orangesCollected, orangeTotal }) =>
      set((state) => {
        const levelKey = String(state.currentLevelId);
        const prev = state.saveData.levels[levelKey] ?? { stars: 0, bestOrange: 0, completed: false };
        const bestOrange = Math.max(prev.bestOrange, orangesCollected);
        const orangeDelta = Math.max(0, orangesCollected - prev.bestOrange);
        const updatedLevel: LevelRecord = {
          stars: Math.max(prev.stars, stars),
          bestOrange,
          completed: true
        };
        const unlocked = new Set(state.saveData.unlockedLevels);
        unlocked.add(state.currentLevelId);
        if (state.currentLevelId < 24) unlocked.add(state.currentLevelId + 1);
        const nextData: SaveData = {
          ...state.saveData,
          totalOranges: state.saveData.totalOranges + orangeDelta,
          unlockedLevels: [...unlocked].sort((a, b) => a - b),
          levels: { ...state.saveData.levels, [levelKey]: updatedLevel }
        };
        persistCurrentMode({ ...state, saveData: nextData } as GameState, nextData);
        return {
          saveData: nextData,
          status: 'gameover',
          gameplayPaused: false,
          stars,
          runOranges: orangesCollected,
          runOrangeTotal: orangeTotal
        };
      }),
    goNextLevel: () =>
      set((state) => {
        if (state.currentLevelId >= 24) {
          return { status: 'level_select', gameplayPaused: false };
        }
        return { currentLevelId: state.currentLevelId + 1, status: 'level_intro', gameplayPaused: false };
      }),
    hydrateCloudSave: async () => {
      const state = get();
      if (state.adminMode || !window.puter?.kv) return;
      try {
        const raw = await window.puter.kv.get(PLAYER_KEY);
        const cloudStr = normalizeCloudValue(raw);
        if (!cloudStr) return;
        const cloudData = JSON.parse(cloudStr) as SaveData;
        const base = buildDefaultSave();
        const merged: SaveData = {
          totalOranges: cloudData.totalOranges ?? 0,
          unlockedLevels: Array.isArray(cloudData.unlockedLevels) && cloudData.unlockedLevels.length > 0 ? cloudData.unlockedLevels : [1],
          levels: { ...base.levels, ...(cloudData.levels ?? {}) },
          unlockedItems: Array.isArray(cloudData.unlockedItems) ? cloudData.unlockedItems : []
        };
        safeSave(PLAYER_KEY, merged);
        set({ saveData: merged });
      } catch {
        // ignore cloud read errors, keep local save
      }
    }
  };
});