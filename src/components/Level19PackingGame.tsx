import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playWin, playWrong } from '../utils/levelAudio';

const TARGET = 10;
const BLOCK_W = 200;

export const Level19PackingGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 19;

  const [stack, setStack] = useState(0);
  const [x, setX] = useState(275);
  const [dir, setDir] = useState(1);
  const [blocks, setBlocks] = useState<Array<{ x: number; w: number }>>([]);
  const [currentW, setCurrentW] = useState(BLOCK_W);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);

  const starsPreview = useMemo(() => (stack >= 12 ? 3 : stack >= TARGET ? 2 : 1), [stack]);

  const succeed = useCallback(() => {
    setEnded(true);
    playWin();
    const stars = stack >= 12 ? 3 : stack >= TARGET ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, stack]);

  useEffect(() => {
    if (!isActive) return;
    setStack(0);
    setX(275);
    setDir(1);
    setBlocks([]);
    setCurrentW(BLOCK_W);
    setEnded(false);
    setFailed(false);
  }, [isActive, runId]);

  useEffect(() => {
    if (!isActive || ended || failed || gameplayPaused) return;
    let raf = 0;
    const tick = () => {
      setX((prev) => {
        let nx = prev + dir * 3.2;
        if (nx < 80 || nx > 670 - currentW) {
          setDir((d) => -d);
          nx = prev + -dir * 3.2;
        }
        return nx;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, ended, failed, gameplayPaused, dir, currentW]);

  useEffect(() => {
    if (stack >= TARGET && !ended) succeed();
  }, [stack, ended, succeed]);

  const drop = () => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const last = blocks[blocks.length - 1];
    const overlap = last ? Math.max(0, Math.min(x + currentW, last.x + last.w) - Math.max(x, last.x)) : currentW;
    if (overlap < 28) {
      playWrong();
      setFailed(true);
      return;
    }
    playCorrect();
    const newX = last ? Math.max(x, last.x) : x;
    setBlocks((b) => [...b, { x: newX, w: overlap }]);
    setCurrentW(overlap);
    setStack((s) => s + 1);
    setX(275);
  };

  if (!isActive) return null;
  const baseY = 680;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🏗 飘移叠楼"
        onPause={() => setGameplayPaused(true)}
        hint="点「落块」叠放，对齐越准方块越宽"
        stats={[
          { label: '层数', value: `${stack}/${TARGET}` },
          { label: '⭐', value: `${starsPreview}/3` }
        ]}
      />
      <div className="flex-1 min-h-0 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-8 w-48 h-12 rounded-full bg-white/30 blur-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[120px] w-3 h-[500px] rounded-full bg-gradient-to-b from-white/50 to-[#ccb494]/40 shadow-inner" />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-2xl border-2 border-white/60"
          style={{ top: baseY + 8, width: 620, height: 20, background: 'linear-gradient(180deg, #ccb494, #a89272)' }}
        />
        {blocks.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-lg border-2 border-white/80 shadow-md"
            style={{
              left: b.x,
              top: baseY - (i + 1) * 30,
              width: b.w,
              height: 28,
              background: `linear-gradient(180deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 2) % PALETTE.length]}aa)`
            }}
          />
        ))}
        <div
          className="absolute rounded-lg border-2 border-white shadow-xl animate-pulse"
          style={{
            left: x,
            top: baseY - (blocks.length + 1) * 30 - 100,
            width: currentW,
            height: 28,
            background: `linear-gradient(180deg, ${FRESH.rose}, ${FRESH.mist})`
          }}
        />
      </div>
      <div className="shrink-0 px-6 pb-10">
        <button
          type="button"
          onClick={drop}
          className="w-full py-5 rounded-3xl font-bold text-white shadow-xl active:scale-[0.98] border-2 border-white"
          style={{ background: FRESH.sage }}
        >
          落块
        </button>
      </div>
      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3 shadow-xl">
            <p className="font-bold text-[#1a3348]">方块掉下去了</p>
            <p className="text-sm text-[#5a7a92]">对准再落，宽一点更稳</p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
