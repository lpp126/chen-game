import { create } from 'zustand';

export type GameStatus = 'home' | 'level_select' | 'start' | 'playing' | 'soothing' | 'gameover';

export interface GameStats {
  perfect: number;
  good: number;
  oops: number;
  total: number; // Total notes passed or clicked
  sootheCount: number;
  totalNotesSpawned: number; // For star calculation: gathered >= 60% of spawned
}

interface GameState {
  status: GameStatus;
  fullness: number; // 0 to 100
  notesCollected: number;
  oranges: number;
  combo: number;
  stars: number;
  consecutiveOops: number;
  stats: GameStats;
  isSootheSuccess: boolean;
  
  // Actions
  setStatus: (status: GameStatus) => void;
  goHome: () => void;
  goLevelSelect: () => void;
  goStartScreen: () => void;
  startGame: () => void;
  recordHit: (type: 'perfect' | 'good' | 'oops') => void;
  addFullness: (val: number) => void;
  collectNoteDrop: () => void;
  spawnNoteDrop: () => void;
  triggerSoothe: () => void;
  endSoothe: () => void;
  setStars: (stars: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'home',
  fullness: 0,
  notesCollected: 0,
  oranges: 0,
  combo: 0,
  stars: 0,
  consecutiveOops: 0,
  isSootheSuccess: false,
  stats: {
    perfect: 0,
    good: 0,
    oops: 0,
    total: 0,
    sootheCount: 0,
    totalNotesSpawned: 0,
  },

  setStatus: (status) => set({ status }),
  
  goHome: () => set({ status: 'home' }),
  goLevelSelect: () => set({ status: 'level_select' }),
  goStartScreen: () => set({ status: 'start' }),

  startGame: () => set({
    status: 'playing',
    fullness: 0,
    notesCollected: 0,
    oranges: 0,
    combo: 0,
    stars: 0,
    consecutiveOops: 0,
    isSootheSuccess: false,
    stats: {
      perfect: 0,
      good: 0,
      oops: 0,
      total: 0,
      sootheCount: 0,
      totalNotesSpawned: 0,
    }
  }),

  recordHit: (type) => set((state) => {
    if (state.status !== 'playing') return state;
    
    let newFullness = state.fullness;
    let newCombo = state.combo;
    let newConsecutiveOops = state.consecutiveOops;
    
    if (type === 'perfect') {
      newFullness = Math.min(100, state.fullness + 2);
      newCombo += 1;
      newConsecutiveOops = 0;
    } else if (type === 'good') {
      newFullness = Math.min(100, state.fullness + 1);
      newCombo += 1;
      newConsecutiveOops = 0;
    } else if (type === 'oops') {
      newFullness = Math.max(0, state.fullness - 1);
      newCombo = 0;
      newConsecutiveOops += 1;
    }

    const newStats = {
      ...state.stats,
      [type]: state.stats[type] + 1,
      total: state.stats.total + 1
    };

    let newStatus: GameStatus = state.status;
    let currentSootheCount = newStats.sootheCount;

    // Check for game over (100 fullness)
    if (newFullness >= 100) {
      newStatus = 'gameover';
    } 
    // Check for soothe
    else if (newConsecutiveOops >= 3) {
      newStatus = 'soothing';
      currentSootheCount += 1;
    }

    newStats.sootheCount = currentSootheCount;

    let newStars = state.stars;
    if (newStatus === 'gameover') {
      const acc = newStats.total > 0 ? (newStats.perfect + newStats.good) / newStats.total : 0;
      const collectRatio = newStats.totalNotesSpawned > 0 ? state.notesCollected / newStats.totalNotesSpawned : 0;
      
      if (acc >= 0.9 && currentSootheCount === 0 && collectRatio >= 0.6) {
        newStars = 3;
      } else if (acc >= 0.7) {
        newStars = 2;
      } else {
        newStars = 1;
      }
    }

    return {
      fullness: newFullness,
      combo: newCombo,
      consecutiveOops: newConsecutiveOops,
      stats: newStats,
      status: newStatus,
      stars: newStars
    };
  }),

  addFullness: (val: number) => set((state) => {
    if (state.status !== 'playing') return state;
    const newFullness = Math.min(100, Math.max(0, state.fullness + val));
    if (newFullness >= 100) {
      return { fullness: newFullness, status: 'gameover' };
    }
    return { fullness: newFullness };
  }),

  spawnNoteDrop: () => set((state) => ({
    stats: {
      ...state.stats,
      totalNotesSpawned: state.stats.totalNotesSpawned + 1
    }
  })),

  collectNoteDrop: () => set((state) => {
    if (state.status !== 'playing') return state;
    const newCollected = state.notesCollected + 1;
    let newOranges = state.oranges;
    let newFullness = state.fullness;
    
    // 彩蛋：每10个奖励一个橙子和2%饱食度
    if (newCollected > 0 && newCollected % 10 === 0) {
      newOranges += 1;
      newFullness = Math.min(100, state.fullness + 2);
      
      if (newFullness >= 100) {
        // Calculate stars
        const acc = state.stats.total > 0 ? (state.stats.perfect + state.stats.good) / state.stats.total : 0;
        const collectRatio = state.stats.totalNotesSpawned > 0 ? newCollected / state.stats.totalNotesSpawned : 0;
        let newStars = 1;
        if (acc >= 0.9 && state.stats.sootheCount === 0 && collectRatio >= 0.6) newStars = 3;
        else if (acc >= 0.7) newStars = 2;
        
        return { notesCollected: newCollected, oranges: newOranges, fullness: newFullness, status: 'gameover', stars: newStars };
      }
      return { notesCollected: newCollected, oranges: newOranges, fullness: newFullness };
    }
    
    return { notesCollected: newCollected };
  }),

  triggerSoothe: () => set((state) => ({
    status: 'soothing',
    stats: { ...state.stats, sootheCount: state.stats.sootheCount + 1 }
  })),

  endSoothe: () => set({
    status: 'playing',
    consecutiveOops: 0,
    isSootheSuccess: true
  }),

  setStars: (stars) => set({ stars }),

  resetGame: () => set({ status: 'home' })
}));