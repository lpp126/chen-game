import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

type Peg = number[];

const clonePegs = (p: Peg[]) => p.map((peg) => [...peg]);

const isWin = (pegs: Peg[]) => pegs[2].length === 3 && pegs[2].every((_, i, arr) => arr[i] === 3 - i);

const canPlace = (disk: number, to: Peg) => to.length === 0 || to[to.length - 1] > disk;

export const Level8MorningRunGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 8;

  const [pegs, setPegs] = useState<Peg[]>(() => [[3, 2, 1], [], []]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [ended, setEnded] = useState(false);
  const [msg, setMsg] = useState('点选柱子再点目标，大盘不能压小盘');

  const starsPreview = useMemo(() => (moves <= 7 ? 3 : moves <= 10 ? 2 : 1), [moves]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    window.setTimeout(() => completeLevel({ stars: starsPreview, orangesCollected: starsPreview, orangeTotal: 3 }), 280);
  }, [completeLevel, starsPreview]);

  useEffect(() => {
    if (!isActive) return;
    setPegs([[3, 2, 1], [], []]);
    setSelected(null);
    setMoves(0);
    setEnded(false);
    setMsg('点选柱子再点目标，大盘不能压小盘');
  }, [isActive, runId]);

  const tapPeg = (pi: number) => {
    if (!isActive || gameplayPaused || ended) return;
    if (selected === null) {
      if (pegs[pi].length === 0) return;
      setSelected(pi);
      playPop();
      return;
    }
    if (selected === pi) {
      setSelected(null);
      return;
    }
    const from = pegs[selected];
    const disk = from[from.length - 1];
    if (!canPlace(disk, pegs[pi])) {
      playWrong();
      setMsg('大盘不能放在小盘上');
      setSelected(null);
      return;
    }
    playPop();
    setPegs((prev) => {
      const next = clonePegs(prev);
      next[pi].push(next[selected!].pop()!);
      if (isWin(next)) {
        playCorrect();
        setMsg('全部移到了右侧！');
        window.setTimeout(succeed, 400);
      }
      return next;
    });
    setMoves((m) => m + 1);
    setSelected(null);
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🗼 汉诺塔"
        onPause={() => setGameplayPaused(true)}
        hint={msg}
        stats={[
          { label: '步数', value: `${moves}（最少7步）` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 flex items-end justify-center gap-6 px-4 pb-16">
        {pegs.map((peg, pi) => (
          <button
            key={pi}
            type="button"
            onClick={() => tapPeg(pi)}
            className={`relative w-28 h-56 flex flex-col-reverse items-center pb-2 transition-transform ${
              selected === pi ? 'scale-105' : ''
            }`}
          >
            <div className="absolute bottom-0 w-full h-3 rounded-full bg-[#ccb494]" />
            <div className={`absolute bottom-3 w-2 h-48 rounded-full ${selected === pi ? 'bg-[#3aab8e]' : 'bg-[#ccb494]/70'}`} />
            {peg.map((disk) => (
              <div
                key={`${pi}-${disk}`}
                className="relative z-10 rounded-xl border-2 border-white shadow-md mb-1"
                style={{
                  width: 36 + disk * 22,
                  height: 22,
                  background: `linear-gradient(145deg, ${PALETTE[disk % PALETTE.length]}, ${PALETTE[(disk + 1) % PALETTE.length]}99)`
                }}
              />
            ))}
            <span className="absolute -bottom-8 text-xs text-[#5a7a92]">{pi === 0 ? '起点' : pi === 2 ? '终点' : '中转'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
