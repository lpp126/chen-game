import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playPop, playWin, playWrong } from '../utils/levelAudio';

type Peg = number[];

/** 两小关：3 盘 → 4 盘 */
const STAGES = [
  { disks: 3, start: [[3, 2, 1], [], []] as Peg[] },
  { disks: 4, start: [[4, 3, 2, 1], [], []] as Peg[] }
];

const clonePegs = (p: Peg[]) => p.map((peg) => [...peg]);

const isWin = (pegs: Peg[], disks: number) =>
  pegs[2].length === disks && pegs[2].every((v, i) => v === disks - i);

const canPlace = (disk: number, to: Peg) => to.length === 0 || to[to.length - 1] > disk;

export const Level8MorningRunGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 8;

  const [stage, setStage] = useState(0);
  const [pegs, setPegs] = useState<Peg[]>(() => clonePegs(STAGES[0].start));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [ended, setEnded] = useState(false);
  const [msg, setMsg] = useState('点选柱子再点目标，大盘不能压小盘');

  const disks = STAGES[stage]?.disks ?? 3;
  // 3 盘最优 7 + 4 盘最优 15 ≈ 22；三星 ≤23（按通关后的最终步数）
  const starsForMoves = useCallback((m: number) => (m <= 23 ? 3 : m <= 36 ? 2 : 1), []);
  const starsPreview = useMemo(() => starsForMoves(moves), [moves, starsForMoves]);

  const succeed = useCallback(
    (finalMoves: number) => {
      setEnded(true);
      playWin();
      const stars = starsForMoves(finalMoves);
      window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
    },
    [completeLevel, starsForMoves]
  );

  useEffect(() => {
    if (!isActive) return;
    setStage(0);
    setPegs(clonePegs(STAGES[0].start));
    setSelected(null);
    setMoves(0);
    setEnded(false);
    setMsg('第 1 关：三盘 · 点选柱子再点目标');
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
    const nextMoves = moves + 1;
    const nextPegs = clonePegs(pegs);
    nextPegs[pi].push(nextPegs[selected].pop()!);
    setPegs(nextPegs);
    setMoves(nextMoves);
    setSelected(null);

    if (isWin(nextPegs, disks)) {
      playCorrect();
      if (stage + 1 >= STAGES.length) {
        setMsg('全部移到了右侧！');
        window.setTimeout(() => succeed(nextMoves), 400);
      } else {
        const ns = stage + 1;
        setMsg(`第 ${stage + 1} 关完成！进入 ${STAGES[ns].disks} 盘挑战`);
        window.setTimeout(() => {
          setStage(ns);
          setPegs(clonePegs(STAGES[ns].start));
          setSelected(null);
          setMsg(`第 ${ns + 1} 关：${STAGES[ns].disks} 盘 · 点选柱子再点目标`);
        }, 500);
      }
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🗼 课后移塔"
        onPause={() => setGameplayPaused(true)}
        hint={msg}
        stats={[
          { label: '小关', value: `${Math.min(stage + 1, STAGES.length)}/${STAGES.length}` },
          { label: '圆盘', value: String(disks) },
          { label: '步数', value: String(moves) }
        ]}
      />
      <div className="flex-1 min-h-0 flex items-end justify-center gap-6 px-4 pb-16">
        {pegs.map((peg, pi) => (
          <button
            key={pi}
            type="button"
            onClick={() => tapPeg(pi)}
            className={`relative w-28 h-64 flex flex-col-reverse items-center pb-2 transition-transform ${
              selected === pi ? 'scale-105' : ''
            }`}
          >
            <div className="absolute bottom-0 w-full h-3 rounded-full bg-[#ccb494]" />
            <div className={`absolute bottom-3 w-2 h-52 rounded-full ${selected === pi ? 'bg-[#3aab8e]' : 'bg-[#ccb494]/70'}`} />
            {peg.map((disk) => (
              <div
                key={`${pi}-${disk}`}
                className="relative z-10 rounded-xl border-2 border-white shadow-md mb-1"
                style={{
                  width: 28 + disk * 18,
                  height: disks === 4 ? 18 : 22,
                  background: `linear-gradient(145deg, ${PALETTE[disk % PALETTE.length]}, ${PALETTE[(disk + 1) % PALETTE.length]}99)`
                }}
              />
            ))}
            <span className="absolute -bottom-8 text-xs text-[#5a7a92]">{pi === 0 ? '起点' : pi === 2 ? '终点' : '中转'}</span>
          </button>
        ))}
      </div>
      {adminMode && (
        <div className="absolute right-4 top-36 z-50">
          <button type="button" onClick={() => completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 })} className="px-3 py-2 bg-black/35 text-white rounded-full text-xs">
            测试通关
          </button>
        </div>
      )}
    </div>
  );
};
