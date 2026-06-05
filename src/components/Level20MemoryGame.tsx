import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playTap, playWin, playWrong } from '../utils/levelAudio';

const COLORS = [
  { id: 0, bg: '#c75b7a', label: '红' },
  { id: 1, bg: '#4a9fd8', label: '蓝' },
  { id: 2, bg: '#7cb8a8', label: '黄' },
  { id: 3, bg: '#7eb8da', label: '紫' }
] as const;

const ROUNDS = 6;
const MAX_MISS = 2;

export const Level20MemoryGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 20;

  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputIdx, setInputIdx] = useState(0);
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [lit, setLit] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const endedRef = useRef(false);

  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses === 1) return 2;
    return 1;
  }, [failed, misses]);

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const stars = misses === 0 ? 3 : misses === 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, misses]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  const startRound = useCallback((r: number) => {
    const len = 3 + r;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    setSequence(seq);
    setInputIdx(0);
    setPhase('show');
    let i = 0;
    const showNext = () => {
      if (i >= seq.length) {
        setLit(null);
        setPhase('input');
        return;
      }
      setLit(seq[i]);
      playTap();
      window.setTimeout(() => {
        setLit(null);
        i += 1;
        window.setTimeout(showNext, 300);
      }, 600);
    };
    window.setTimeout(showNext, 500);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setRound(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
    endedRef.current = false;
    startRound(0);
  }, [isActive, runId, startRound]);

  const pick = (id: number) => {
    if (!isActive || gameplayPaused || ended || phase !== 'input') return;
    if (sequence[inputIdx] === id) {
      playCorrect();
      const ni = inputIdx + 1;
      setInputIdx(ni);
      if (ni >= sequence.length) {
        if (round + 1 >= ROUNDS) succeed();
        else {
          const nr = round + 1;
          setRound(nr);
          window.setTimeout(() => startRound(nr), 800);
        }
      }
    } else {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) fail();
        else startRound(round);
        return nm;
      });
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🎬 镜头倒数"
        onPause={() => setGameplayPaused(true)}
        hint={phase === 'show' ? '记住亮灯顺序…' : '按相同顺序点击复现'}
        stats={[
          { label: '轮次', value: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 bg-[#1a1428]">
        <div className="grid grid-cols-2 gap-4">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pick(c.id)}
            disabled={phase !== 'input'}
            className="w-36 h-36 rounded-3xl border-4 border-white/30 transition-all active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: c.bg, boxShadow: lit === c.id ? `0 0 40px ${c.bg}` : undefined, transform: lit === c.id ? 'scale(1.08)' : undefined }}
          />
        ))}
        </div>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/40 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-5 text-center space-y-3">
            <h3 className="text-lg font-bold">顺序记错了</h3>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-2 rounded-xl bg-[#f9dccf] font-semibold">再来一局</button>
            <button type="button" onClick={goLevelSelect} className="w-full py-2 rounded-xl bg-[#e3f2fc]">返回关卡</button>
          </div>
        </div>
      )}
    </div>
  );
};
