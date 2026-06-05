import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const EMOJIS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐷', '🐮'];
const TARGET = 6;
const MAX_MISS = 3;

type Round = { base: string[]; wrongIdx: number; wrongEmoji: string };

const makeRound = (): Round => {
  const baseEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const base = Array.from({ length: 16 }, () => baseEmoji);
  const wrongIdx = Math.floor(Math.random() * 16);
  let wrongEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  while (wrongEmoji === baseEmoji) wrongEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  return { base, wrongIdx, wrongEmoji };
};

export const Level11SpotlightGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 11;

  const [round, setRound] = useState<Round>(() => makeRound());
  const [done, setDone] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);

  const bottom = useMemo(() => {
    const g = [...round.base];
    g[round.wrongIdx] = round.wrongEmoji;
    return g;
  }, [round]);

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
    setRound(makeRound());
    setDone(0);
    setMisses(0);
    setEnded(false);
    setFailed(false);
    setFlash(null);
  }, [isActive, runId]);

  const tap = (i: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    if (i === round.wrongIdx) {
      playCorrect();
      setFlash(i);
      const nd = done + 1;
      setDone(nd);
      if (nd >= TARGET) window.setTimeout(succeed, 400);
      else window.setTimeout(() => {
        setRound(makeRound());
        setFlash(null);
      }, 500);
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

  const renderGrid = (cells: string[], clickable: boolean) => (
    <div className="grid grid-cols-4 gap-1.5 p-3 rounded-2xl bg-white/85 border border-white shadow-md">
      {cells.map((e, i) => (
        <button
          key={i}
          type="button"
          disabled={!clickable}
          onClick={() => tap(i)}
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
            clickable ? 'active:scale-95 bg-white/90' : 'bg-[#e3f2fc]/80'
          } ${flash === i ? 'ring-4 ring-[#3aab8e]' : ''}`}
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🔍 找不同"
        onPause={() => setGameplayPaused(true)}
        hint="下图有一个格子与上图不同，点出来"
        stats={[
          { label: '进度', value: `${done}/${TARGET}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-xs text-[#5a7a92]">参考图</p>
        {renderGrid(round.base, false)}
        <p className="text-xs text-[#5a7a92]">找出不同 👇</p>
        {renderGrid(bottom, true)}
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
