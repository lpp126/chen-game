import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playDrop, playWin, playWrong } from '../utils/levelAudio';

type StageConfig = {
  label: string;
  target: number;
  blockW: number;
  speed: number;
  minOverlap: number;
  xMin: number;
  xMaxPad: number;
};

/** 练习 → 挑战 → 高手（略快、略严） */
const STAGES: StageConfig[] = [
  { label: '练习', target: 6, blockW: 360, speed: 2.1, minOverlap: 18, xMin: 60, xMaxPad: 690 },
  { label: '挑战', target: 10, blockW: 300, speed: 3.2, minOverlap: 28, xMin: 80, xMaxPad: 670 },
  { label: '高手', target: 12, blockW: 280, speed: 3.8, minOverlap: 32, xMin: 70, xMaxPad: 680 }
];

export const Level19PackingGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 19;

  const [stageIdx, setStageIdx] = useState(0);
  const [stack, setStack] = useState(0);
  const [x, setX] = useState(195);
  const [dir, setDir] = useState(1);
  const [blocks, setBlocks] = useState<Array<{ x: number; w: number }>>([]);
  const [currentW, setCurrentW] = useState(STAGES[0].blockW);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const stageRef = useRef(0);

  const stage = STAGES[stageIdx];
  const starsPreview = useMemo(() => {
    if (failed) return 0;
    if (stageIdx >= 1 && stack >= stage.target) return 3;
    if (stageIdx >= 1) return 2;
    return 1;
  }, [failed, stageIdx, stack, stage.target]);

  const succeedAll = useCallback(() => {
    setEnded(true);
    playWin();
    const stars = 3;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel]);

  const resetStage = useCallback((idx: number) => {
    const s = STAGES[idx];
    stageRef.current = idx;
    setStageIdx(idx);
    setStack(0);
    setX(Math.round((750 - s.blockW) / 2));
    setDir(1);
    setBlocks([]);
    setCurrentW(s.blockW);
    setFailed(false);
    setAdvancing(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setEnded(false);
    resetStage(0);
  }, [isActive, runId, resetStage]);

  useEffect(() => {
    if (!isActive || ended || failed || gameplayPaused || advancing) return;
    const spd = STAGES[stageRef.current].speed;
    let raf = 0;
    const tick = () => {
      setX((prev) => {
        const s = STAGES[stageRef.current];
        let nx = prev + dir * spd;
        if (nx < s.xMin || nx > s.xMaxPad - currentW) {
          setDir((d) => -d);
          nx = prev + -dir * spd;
        }
        return nx;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, ended, failed, gameplayPaused, advancing, dir, currentW]);

  useEffect(() => {
    if (!isActive || ended || failed || advancing) return;
    if (stack < stage.target) return;
    if (stageIdx + 1 >= STAGES.length) {
      succeedAll();
    } else {
      setAdvancing(true);
      window.setTimeout(() => resetStage(stageIdx + 1), 500);
    }
  }, [stack, stage.target, stageIdx, isActive, ended, failed, advancing, resetStage, succeedAll]);

  const drop = () => {
    if (!isActive || gameplayPaused || ended || failed || advancing) return;
    const s = STAGES[stageRef.current];
    const last = blocks[blocks.length - 1];
    const overlap = last ? Math.max(0, Math.min(x + currentW, last.x + last.w) - Math.max(x, last.x)) : currentW;
    if (overlap < s.minOverlap) {
      playWrong();
      setFailed(true);
      return;
    }
    playDrop();
    playCorrect();
    const newX = last ? Math.max(x, last.x) : x;
    setBlocks((b) => [...b, { x: newX, w: overlap }]);
    setCurrentW(overlap);
    setStack((st) => st + 1);
    setX(Math.round((750 - overlap) / 2));
  };

  if (!isActive) return null;
  const baseY = 680;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title="🏗 叠高一层"
        onPause={() => setGameplayPaused(true)}
        hint={`${stage.label}：点「落块」叠放，对齐越准方块越宽`}
        stats={[
          { label: '关', value: `${Math.min(stageIdx + 1, STAGES.length)}/${STAGES.length}` },
          { label: '层数', value: `${stack}/${stage.target}` }
        ]}
      />
      <div className="flex-1 min-h-0 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-8 w-48 h-12 rounded-full bg-white/30 blur-sm" />
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
          disabled={advancing}
          className="w-full py-5 rounded-3xl font-bold text-white shadow-xl active:scale-[0.98] border-2 border-white disabled:opacity-50"
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
            <p className="text-xs text-[#5a7a92]">预估星级 {starsPreview}/3</p>
            <button type="button" onClick={restartCurrentLevel} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white font-semibold">
              再来一局
            </button>
            <button type="button" onClick={goLevelSelect} className="w-full py-3 rounded-xl bg-[#e3f2fc]">
              返回关卡
            </button>
          </div>
        </div>
      )}
      {adminMode && (
        <button
          type="button"
          onClick={() => completeLevel({ stars: 3, orangesCollected: 3, orangeTotal: 3 })}
          className="absolute right-4 top-36 z-50 px-3 py-2 bg-black/35 text-white rounded-full text-xs"
        >
          测试通关
        </button>
      )}
    </div>
  );
};
