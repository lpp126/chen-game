import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

type Lock = { clue: string; digits: [number, number, number] };

const LOCKS: Lock[] = [
  { clue: '成年啦：1 和 8 岁', digits: [1, 8, 0] },
  { clue: '宿舍门牌：2 楼 0 4 室', digits: [2, 0, 4] },
  { clue: '幸运数：三个 6', digits: [6, 6, 6] }
];

export const Level18SlidePuzzleGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 18;

  const [lockIdx, setLockIdx] = useState(0);
  const [wheels, setWheels] = useState<[number, number, number]>([0, 0, 0]);
  const [mistakes, setMistakes] = useState(0);
  const [ended, setEnded] = useState(false);
  const lock = LOCKS[lockIdx];

  const starsPreview = useMemo(() => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), [mistakes]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setLockIdx(0);
    setWheels([0, 0, 0]);
    setMistakes(0);
    setEnded(false);
  }, [isActive, runId]);

  const spin = (wi: number, delta: number) => {
    if (!isActive || gameplayPaused || ended) return;
    playPop();
    setWheels((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[wi] = (next[wi] + delta + 10) % 10;
      return next;
    });
  };

  const unlock = () => {
    if (!isActive || gameplayPaused || ended) return;
    if (wheels.every((d, i) => d === lock.digits[i])) {
      playCorrect();
      if (lockIdx + 1 >= LOCKS.length) succeed();
      else {
        setLockIdx((i) => i + 1);
        setWheels([0, 0, 0]);
      }
    } else {
      playWrong();
      setMistakes((m) => m + 1);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔢 数字转盘锁"
        onPause={() => setGameplayPaused(true)}
        hint={lock.clue}
        stats={[
          { label: '锁', value: `${lockIdx + 1}/${LOCKS.length}` },
          { label: '失误', value: String(mistakes) },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-8 px-5">
        <div className="w-full max-w-[340px] rounded-3xl bg-white/90 border border-white shadow-lg px-6 py-8 text-center">
          <p className="text-lg text-[#1a3348] leading-relaxed">{lock.clue}</p>
        </div>
        <div className="flex gap-4">
          {wheels.map((d, wi) => (
            <div key={wi} className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => spin(wi, 1)} className="w-12 h-10 rounded-xl bg-white/90 border border-white font-bold active:scale-95">▲</button>
              <div className="w-16 h-20 rounded-2xl bg-[#e3f2fc] border-2 border-white flex items-center justify-center text-4xl font-bold text-[#1a3348]">{d}</div>
              <button type="button" onClick={() => spin(wi, -1)} className="w-12 h-10 rounded-xl bg-white/90 border border-white font-bold active:scale-95">▼</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={unlock} className="w-full max-w-[280px] py-4 rounded-2xl bg-[#3aab8e] text-white font-bold border-2 border-white shadow-md active:scale-95">
          解锁
        </button>
      </div>
    </div>
  );
};
