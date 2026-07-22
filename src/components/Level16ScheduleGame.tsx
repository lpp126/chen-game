import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

type Puzzle = { givens: number[][]; solution: number[][] };

const PUZZLES: Puzzle[] = [
  {
    givens: [
      [1, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 3]
    ],
    solution: [
      [1, 3, 4, 2],
      [2, 4, 1, 3],
      [3, 1, 2, 4],
      [4, 2, 3, 1]
    ]
  },
  {
    givens: [
      [0, 2, 0, 0],
      [0, 0, 0, 4],
      [0, 0, 3, 0],
      [1, 0, 0, 0]
    ],
    solution: [
      [4, 2, 1, 3],
      [3, 1, 2, 4],
      [2, 4, 3, 1],
      [1, 3, 4, 2]
    ]
  }
];

const getConflicts = (grid: number[][]) => {
  const bad = new Set<string>();
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const v = grid[r][c];
      if (!v) continue;
      for (let cc = c + 1; cc < 4; cc += 1) if (grid[r][cc] === v) { bad.add(`${r},${c}`); bad.add(`${r},${cc}`); }
      for (let rr = r + 1; rr < 4; rr += 1) if (grid[rr][c] === v) { bad.add(`${r},${c}`); bad.add(`${rr},${c}`); }
      const br = Math.floor(r / 2) * 2;
      const bc = Math.floor(c / 2) * 2;
      for (let rr = br; rr < br + 2; rr += 1) {
        for (let cc = bc; cc < bc + 2; cc += 1) {
          if (rr === r && cc === c) continue;
          if (grid[rr][cc] === v) { bad.add(`${r},${c}`); bad.add(`${rr},${cc}`); }
        }
      }
    }
  }
  return bad;
};

const isCompleteValid = (grid: number[][]) => {
  if (!grid.every((row) => row.every((v) => v !== 0))) return false;
  return getConflicts(grid).size === 0;
};

export const Level16ScheduleGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 21;

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = PUZZLES[puzzleIdx];
  const [grid, setGrid] = useState<number[][]>(() => puzzle.givens.map((row) => [...row]));
  const [givens, setGivens] = useState<number[][]>(() => puzzle.givens.map((row) => [...row]));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [ended, setEnded] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  const conflicts = useMemo(() => getConflicts(grid), [grid]);
  const filled = grid.every((row) => row.every((v) => v !== 0));
  const starsPreview = useMemo(() => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), [mistakes]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, mistakes]);

  useEffect(() => {
    if (!isActive) return;
    const p = PUZZLES[0];
    setPuzzleIdx(0);
    setGrid(p.givens.map((row) => [...row]));
    setGivens(p.givens.map((row) => [...row]));
    setSelected(null);
    setEnded(false);
    setMistakes(0);
    setHint(null);
  }, [isActive, runId]);

  const loadPuzzle = (i: number) => {
    const p = PUZZLES[i];
    setPuzzleIdx(i);
    setGrid(p.givens.map((row) => [...row]));
    setGivens(p.givens.map((row) => [...row]));
    setSelected(null);
    setHint(null);
  };

  const tapCell = (r: number, c: number) => {
    if (givens[r][c] || ended) return;
    setSelected([r, c]);
    setHint(null);
  };

  const tapNum = (n: number) => {
    if (!selected || ended) return;
    const [r, c] = selected;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = n;
      return next;
    });
  };

  const erase = () => {
    if (!selected || ended || givens[selected[0]][selected[1]]) return;
    const [r, c] = selected;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = 0;
      return next;
    });
  };

  const check = () => {
    if (!filled || ended) {
      setHint('请先填满所有空格');
      return;
    }
    if (conflicts.size > 0) {
      playWrong();
      setHint('有重复数字，红色格子请修改');
      setMistakes((m) => m + 1);
      return;
    }
    if (isCompleteValid(grid)) {
      playCorrect();
      if (puzzleIdx + 1 < PUZZLES.length) {
        setHint('第一题完成！进入下一题');
        window.setTimeout(() => loadPuzzle(puzzleIdx + 1), 600);
      } else succeed();
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔢 夜灯数独"
        onPause={() => setGameplayPaused(true)}
        hint={hint ?? `第 ${puzzleIdx + 1}/${PUZZLES.length} 题 · 四个 2×2 宫格各含 1-4 各一次`}
        stats={[
          { label: '失误', value: String(mistakes) }
        ]}
      />

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
        <div className="grid grid-cols-4 gap-1.5 p-3 rounded-3xl bg-white/65 border border-white/80 shadow-md relative">
          <div className="absolute inset-3 pointer-events-none grid grid-cols-2 grid-rows-2 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border-2 border-[#ccb494]/50" />
            ))}
          </div>
          {grid.map((row, r) =>
            row.map((v, c) => {
              const isGiven = !!givens[r][c];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const conflict = conflicts.has(`${r},${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => tapCell(r, c)}
                  className={`w-[68px] h-[68px] sm:w-[72px] sm:h-[72px] text-2xl font-bold rounded-xl border-2 transition-all active:scale-95 ${
                    isGiven
                      ? 'bg-[#e3f2fc] text-[#5a7a92] border-transparent'
                      : conflict
                        ? 'bg-[#e3f2fc] border-[#7eb8da] text-[#c75b7a]'
                        : isSel
                          ? 'bg-white border-[#9eb39f] shadow-md scale-105 text-[#1a3348]'
                          : 'bg-white/90 border-white text-[#1a3348]'
                  }`}
                >
                  {v || ''}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-8 pt-3 z-50 bg-gradient-to-t from-[#cfe4f0] via-[#cfe4f0ee] to-transparent">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => tapNum(n)}
              className="h-14 rounded-2xl text-xl font-bold text-[#1a3348] border-2 border-white shadow-md active:scale-95"
              style={{ background: `linear-gradient(145deg, ${FRESH.rose}55, ${FRESH.mist}88)` }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={erase} className="flex-1 py-3 rounded-xl bg-white/80 border border-white font-semibold text-[#1a3348]">
            擦除
          </button>
          <button type="button" onClick={check} className="flex-[2] py-3 rounded-xl bg-[#3aab8e] text-white font-bold border-2 border-white shadow-md">
            检查答案
          </button>
        </div>
      </div>
    </div>
  );
};
