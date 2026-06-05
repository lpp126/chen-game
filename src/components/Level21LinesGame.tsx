import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

const TARGET = 5;
const MAX_MISS = 2;

type Round = { words: string[]; answer: string[] };

const ROUNDS: Round[] = [
  { words: ['这一眼', '是', '久别重逢'], answer: ['这一眼', '是', '久别重逢'] },
  { words: ['请相信', '光', '会来的'], answer: ['请相信', '光', '会来的'] },
  { words: ['台词', '可以忘', '情感不能丢'], answer: ['台词', '可以忘', '情感不能丢'] },
  { words: ['镜头停了', '故事', '还在继续'], answer: ['镜头停了', '故事', '还在继续'] },
  { words: ['我不是英雄', '只是', '不想后悔'], answer: ['我不是英雄', '只是', '不想后悔'] },
  { words: ['愿你', '被世界', '温柔以待'], answer: ['愿你', '被世界', '温柔以待'] }
];

const shuffle = <T,>(arr: T[]) => {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};

export const Level21LinesGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 21;

  const [order] = useState(() => shuffle(ROUNDS.map((_, i) => i)).slice(0, TARGET));
  const [idx, setIdx] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>(() => shuffle([...ROUNDS[order[0]].words]));
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const round = ROUNDS[order[idx]];
  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses === 1) return 2;
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
    setBuilt([]);
    setPool(shuffle([...ROUNDS[order[0]].words]));
    setMisses(0);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId, order]);

  const nextRound = (ni: number) => {
    setIdx(ni);
    setBuilt([]);
    setPool(shuffle([...ROUNDS[order[ni]].words]));
  };

  const tapWord = (word: string, wi: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const expect = round.answer[built.length];
    if (word !== expect) {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) setFailed(true);
        return nm;
      });
      setBuilt([]);
      setPool(shuffle([...round.words]));
      return;
    }
    playPop();
    const nb = [...built, word];
    setBuilt(nb);
    setPool((p) => p.filter((_, i) => i !== wi));
    if (nb.length >= round.answer.length) {
      playCorrect();
      if (idx + 1 >= TARGET) succeed();
      else nextRound(idx + 1);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="📝 台词排句"
        onPause={() => setGameplayPaused(true)}
        hint="按正确语序依次点选词块"
        stats={[
          { label: '句', value: `${idx + 1}/${TARGET}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-5 gap-5">
        <div className="min-h-[72px] w-full max-w-[360px] rounded-2xl bg-white/90 border border-white px-4 py-3 flex flex-wrap gap-2 items-center justify-center">
          {built.length === 0 ? <span className="text-sm text-[#5a7a92]">已排句子会显示在这里</span> : built.map((w, i) => <span key={i} className="px-3 py-1 rounded-full bg-[#e3f2fc] text-[#1a3348]">{w}</span>)}
        </div>
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-[360px]">
          {pool.map((w, i) => (
            <button key={`${w}-${i}`} type="button" onClick={() => tapWord(w, i)} className="px-5 py-3 rounded-2xl bg-white/90 border border-white shadow-md text-[#1a3348] font-medium active:scale-95">
              {w}
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
