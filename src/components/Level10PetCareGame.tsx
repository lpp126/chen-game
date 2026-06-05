import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin } from '../utils/levelAudio';

/** 由全灭状态经 1~3 次点击生成（正确四邻规则），保证可解 */
const PUZZLES = [
  [1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 1, 1, 0, 0],
  [1, 1, 1, 0, 1, 0, 0, 0, 0]
];

const COLS = 3;

const clone = (g: number[]) => [...g];

const toggle = (g: number[], idx: number) => {
  const next = clone(g);
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  const flip = (i: number) => {
    if (i >= 0 && i < 9) next[i] ^= 1;
  };
  flip(idx);
  if (col > 0) flip(idx - 1);
  if (col < COLS - 1) flip(idx + 1);
  if (row > 0) flip(idx - COLS);
  if (row < 2) flip(idx + COLS);
  return next;
};

const allOff = (g: number[]) => g.every((v) => v === 0);

/** 从当前局面 BFS 求最短解，用于动态提示 */
const solveFrom = (start: number[]): number[] => {
  if (allOff(start)) return [];
  const key = (a: number[]) => a.join('');
  const seen = new Map<string, { prev: string; tap: number }>();
  const q: number[][] = [start];
  seen.set(key(start), { prev: '', tap: -1 });
  while (q.length) {
    const state = q.shift()!;
    if (allOff(state)) {
      const path: number[] = [];
      let k = key(state);
      while (k) {
        const entry = seen.get(k)!;
        if (entry.tap >= 0) path.unshift(entry.tap);
        k = entry.prev;
      }
      return path;
    }
    for (let i = 0; i < 9; i += 1) {
      const ns = toggle(state, i);
      const nk = key(ns);
      if (!seen.has(nk)) {
        seen.set(nk, { prev: key(state), tap: i });
        q.push(ns);
      }
    }
  }
  return [];
};

export const Level10PetCareGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 10;

  const [pIdx, setPIdx] = useState(0);
  const [grid, setGrid] = useState(() => clone(PUZZLES[0]));
  const [taps, setTaps] = useState(0);
  const [ended, setEnded] = useState(false);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [usedHints, setUsedHints] = useState(0);

  const starsPreview = useMemo(() => {
    if (usedHints === 0 && taps <= 10) return 3;
    if (usedHints <= 1 && taps <= 14) return 2;
    return 1;
  }, [taps, usedHints]);

  const succeedAll = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setPIdx(0);
    setGrid(clone(PUZZLES[0]));
    setTaps(0);
    setEnded(false);
    setHintCell(null);
    setMsg(null);
    setUsedHints(0);
  }, [isActive, runId]);

  const loadPuzzle = (i: number) => {
    setGrid(clone(PUZZLES[i]));
    setHintCell(null);
    setMsg(null);
  };

  const tap = (i: number) => {
    if (!isActive || gameplayPaused || ended) return;
    playPop();
    setHintCell(null);
    setTaps((t) => t + 1);
    setGrid((prev) => {
      const next = toggle(prev, i);
      if (allOff(next)) {
        playCorrect();
        setPIdx((pi) => {
          if (pi + 1 >= PUZZLES.length) {
            setMsg('全部熄灭！');
            window.setTimeout(succeedAll, 350);
            return pi;
          }
          setMsg(`第 ${pi + 1} 关完成！`);
          const ni = pi + 1;
          window.setTimeout(() => loadPuzzle(ni), 500);
          return ni;
        });
      }
      return next;
    });
  };

  const showHint = () => {
    if (!isActive || gameplayPaused || ended) return;
    const sol = solveFrom(grid);
    if (sol.length === 0) {
      setMsg(allOff(grid) ? '本关已全灭' : '当前局面异常，请点重置');
      setHintCell(null);
      return;
    }
    setUsedHints((h) => h + 1);
    setHintCell(sol[0]);
    setMsg(`提示：还需 ${sol.length} 步 · 点高亮格（可多次点提示跟进）`);
  };

  const resetPuzzle = () => {
    if (!isActive || gameplayPaused || ended) return;
    loadPuzzle(pIdx);
    setMsg('已重置本关');
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="💡 点灯小游戏"
        onPause={() => setGameplayPaused(true)}
        hint={msg ?? '点击格子会翻转自身及上下左右（不含斜对角、不跨行折返）'}
        stats={[
          { label: '关', value: `${Math.min(pIdx + 1, PUZZLES.length)}/${PUZZLES.length}` },
          { label: '点击', value: String(taps) },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5">
        <div className="grid grid-cols-3 gap-2 p-4 rounded-3xl bg-white/80 border border-white shadow-lg">
          {grid.map((on, i) => (
            <button
              key={i}
              type="button"
              onClick={() => tap(i)}
              className={`w-20 h-20 rounded-2xl border-2 shadow-md active:scale-95 transition-all ${
                hintCell === i ? 'border-[#9eb39f] ring-4 ring-[#3aab8e]/40 scale-105' : 'border-white'
              } ${on ? 'bg-[#f5e6a8] shadow-[inset_0_0_20px_#fff6d8]' : 'bg-[#e3f2fc]'}`}
            >
              {on ? '💡' : ''}
            </button>
          ))}
        </div>
        <div className="flex gap-3 px-6 w-full max-w-[320px]">
          <button type="button" onClick={showHint} className="flex-1 py-3 rounded-xl bg-white/90 border border-white text-sm font-semibold text-[#1a3348] active:scale-95">
            💡 下一步提示
          </button>
          <button type="button" onClick={resetPuzzle} className="flex-1 py-3 rounded-xl bg-white/90 border border-white text-sm font-semibold text-[#1a3348] active:scale-95">
            ↺ 重置
          </button>
        </div>
      </div>
    </div>
  );
};
