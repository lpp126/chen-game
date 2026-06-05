import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

const STEPS = [
  { id: 'base', label: '蛋糕胚', emoji: '🥞' },
  { id: 'cream', label: '抹奶油', emoji: '🍦' },
  { id: 'fruit', label: '放水果', emoji: '🍓' },
  { id: 'candle', label: '插蜡烛', emoji: '🕯️' }
];

const shuffle = <T,>(arr: T[]) => {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};

export const Level24BirthdayGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 24;

  const [pool, setPool] = useState(() => shuffle(STEPS));
  const [built, setBuilt] = useState<typeof STEPS>([]);
  const [mistakes, setMistakes] = useState(0);
  const [ended, setEnded] = useState(false);

  const starsPreview = useMemo(() => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), [mistakes]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setPool(shuffle(STEPS));
    setBuilt([]);
    setMistakes(0);
    setEnded(false);
  }, [isActive, runId]);

  const tap = (step: (typeof STEPS)[0]) => {
    if (!isActive || gameplayPaused || ended) return;
    const expect = STEPS[built.length];
    if (step.id !== expect.id) {
      playWrong();
      setMistakes((m) => m + 1);
      setBuilt([]);
      setPool(shuffle(STEPS));
      return;
    }
    playPop();
    const nb = [...built, step];
    setBuilt(nb);
    setPool((p) => p.filter((s) => s.id !== step.id));
    if (nb.length >= STEPS.length) {
      playCorrect();
      succeed();
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🎂 蛋糕制作"
        onPause={() => setGameplayPaused(true)}
        hint="按顺序制作：胚 → 奶油 → 水果 → 蜡烛"
        stats={[
          { label: '进度', value: `${built.length}/${STEPS.length}` },
          { label: '失误', value: String(mistakes) },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-6">
        <div className="w-full max-w-[320px] min-h-[120px] rounded-3xl bg-white/90 border-2 border-white shadow-lg flex flex-col items-center justify-end px-4 py-4 gap-1">
          {built.length === 0 ? (
            <span className="text-sm text-[#5a7a92]">蛋糕会在这里叠起来</span>
          ) : (
            built.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-lg font-semibold text-[#1a3348]">
                <span className="text-2xl">{s.emoji}</span>
                <span>{s.label}</span>
              </div>
            ))
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
          {pool.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => tap(s)}
              className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-white/90 border-2 border-white shadow-md active:scale-95"
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className="text-sm font-medium text-[#1a3348]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
