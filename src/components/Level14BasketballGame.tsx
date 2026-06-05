import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

type Q = { left: string; right: string; lv: number; rv: number };

const ROUNDS: Q[] = [
  { left: '7 + 8', right: '20 − 4', lv: 15, rv: 16 },
  { left: '6 × 3', right: '25 − 8', lv: 18, rv: 17 },
  { left: '48 ÷ 4', right: '5 × 3', lv: 12, rv: 15 },
  { left: '9 + 14', right: '30 − 6', lv: 23, rv: 24 },
  { left: '11 × 2', right: '35 − 12', lv: 22, rv: 23 },
  { left: '100 ÷ 5', right: '6 × 4', lv: 20, rv: 24 }
];

const TARGET = 6;
const MAX_MISS = 3;

export const Level14BasketballGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 14;

  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pickSide, setPickSide] = useState<'left' | 'right' | null>(null);

  const q = ROUNDS[idx % ROUNDS.length];
  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses <= 2) return 2;
    return 1;
  }, [failed, misses]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setIdx(0);
    setDone(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
    setPickSide(null);
  }, [isActive, runId]);

  const choose = (side: 'left' | 'right') => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const bigger = q.lv >= q.rv ? 'left' : 'right';
    setPickSide(side);
    if (side === bigger) {
      playCorrect();
      const nd = done + 1;
      setDone(nd);
      if (nd >= TARGET) window.setTimeout(succeed, 450);
      else window.setTimeout(() => {
        setIdx((i) => i + 1);
        setPickSide(null);
      }, 550);
    } else {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) setFailed(true);
        return nm;
      });
      window.setTimeout(() => setPickSide(null), 500);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="⚡ 比大小"
        onPause={() => setGameplayPaused(true)}
        hint="哪边算式结果更大？点选一侧"
        stats={[
          { label: '进度', value: `${done}/${TARGET}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-6">
        <p className="text-sm text-[#5a7a92]">心算比大小</p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-[360px]">
          {(['left', 'right'] as const).map((side) => {
            const label = side === 'left' ? q.left : q.right;
            const sel = pickSide === side;
            const win = pickSide && (q.lv >= q.rv ? 'left' : 'right') === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => choose(side)}
                disabled={!!pickSide}
                className={`py-10 rounded-3xl border-2 border-white shadow-lg text-2xl font-bold active:scale-95 transition-all ${
                  sel && win ? 'bg-[#3aab8e] text-white' : sel ? 'bg-[#e3f2fc] text-[#c75b7a]' : 'bg-white/90 text-[#1a3348]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">再来一局</button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">返回关卡</button>
          </div>
        </div>
      )}
    </div>
  );
};
