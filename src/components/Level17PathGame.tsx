import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const TARGET = 6;
const MAX_MISS = 3;

type Item = { seq: string[]; options: string[]; answer: string; hint: string };

const ROUNDS: Item[] = [
  { seq: ['🔴', '🔵', '🔴', '🔵'], options: ['🔴', '🔵', '🟢', '🟡'], answer: '🔴', hint: '红蓝交替' },
  { seq: ['⭐', '⭐', '🌙', '⭐', '⭐', '🌙'], options: ['⭐', '🌙', '☀️', '🌈'], answer: '⭐', hint: '两颗星后一个月亮' },
  { seq: ['🍎', '🍎', '🍐', '🍎', '🍎', '🍐'], options: ['🍎', '🍐', '🍊', '🍇'], answer: '🍎', hint: '两个苹果一个梨' },
  { seq: ['1', '2', '4', '8'], options: ['12', '16', '10', '6'], answer: '16', hint: '每次乘以 2' },
  { seq: ['△', '□', '○', '△', '□'], options: ['○', '△', '□', '☆'], answer: '○', hint: '三种形状循环' },
  { seq: ['🌸', '🌿', '🌸', '🌿', '🌸'], options: ['🌿', '🌸', '🌻', '🍀'], answer: '🌿', hint: '花与叶交替' },
  { seq: ['A', 'C', 'E', 'G'], options: ['H', 'I', 'J', 'K'], answer: 'I', hint: '每隔一个字母' },
  { seq: ['🔵', '🔵', '🟡', '🔵', '🔵'], options: ['🟡', '🔵', '🔴', '🟢'], answer: '🟡', hint: '两蓝一黄' }
];

const shuffle = <T,>(arr: T[]) => {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};

export const Level17PathGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 17;

  const [order] = useState(() => shuffle(ROUNDS.map((_, i) => i)).slice(0, TARGET));
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const round = ROUNDS[order[idx]];
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
    setCorrect(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId]);

  const pick = (opt: string) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    if (opt === round.answer) {
      playCorrect();
      const nc = correct + 1;
      setCorrect(nc);
      if (nc >= TARGET) succeed();
      else setIdx((i) => i + 1);
    } else {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) setFailed(true);
        return nm;
      });
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔍 规律推理"
        onPause={() => setGameplayPaused(true)}
        hint="观察序列规律，选出下一个"
        stats={[
          { label: '进度', value: `${correct}/${TARGET}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-6">
        <div className="rounded-3xl bg-white/90 border border-white shadow-lg px-6 py-8 w-full max-w-[360px] text-center">
          <p className="text-xs text-[#5a7a92] mb-4">{round.hint}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-3xl">
            {round.seq.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
            <span className="text-[#5a7a92]">?</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
          {round.options.map((opt) => (
            <button key={opt} type="button" onClick={() => pick(opt)} className="py-4 rounded-2xl bg-white/90 border border-white text-xl font-semibold shadow-md active:scale-95">
              {opt}
            </button>
          ))}
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
