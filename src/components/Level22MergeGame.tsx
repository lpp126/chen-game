import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LevelTopBar } from './LevelTopBar';
import { useGameStore } from '../store/gameStore';
import { FRESH, PALETTE } from '../utils/levelTheme';
import { playCorrect, playPop, playSwipe, playWin, playWrong } from '../utils/levelAudio';

type Stage = { hitsNeeded: number; intervalMs: number; litMs: number; label: string };

const STAGES: Stage[] = [
  { hitsNeeded: 8, intervalMs: 900, litMs: 700, label: '热身' },
  { hitsNeeded: 10, intervalMs: 680, litMs: 520, label: '加速' },
  { hitsNeeded: 12, intervalMs: 540, litMs: 400, label: '极限' }
];

const CELL_COUNT = 4;
const MAX_MISS = 3;

export const Level22MergeGame: React.FC = () => {
  const { status, currentLevelId, gameplayPaused, setGameplayPaused, restartCurrentLevel, goLevelSelect, completeLevel, adminMode, runId } =
    useGameStore();
  const isActive = status === 'playing' && currentLevelId === 14;

  const [stageIdx, setStageIdx] = useState(0);
  const [hits, setHits] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [misses, setMisses] = useState(0);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pulse, setPulse] = useState(0);

  const litRef = useRef<number | null>(null);
  const hitThisLitRef = useRef(false);
  const stageIdxRef = useRef(0);
  const endedRef = useRef(false);

  const stage = STAGES[stageIdx];
  const starsPreview = useMemo(() => {
    if (failed) return misses <= 1 ? 1 : 0;
    if (misses === 0) return 3;
    if (misses <= 1) return 2;
    return 1;
  }, [failed, misses]);

  const succeed = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    playWin();
    const stars = misses === 0 ? 3 : misses <= 1 ? 2 : 1;
    window.setTimeout(() => completeLevel({ stars, orangesCollected: stars, orangeTotal: 3 }), 280);
  }, [completeLevel, misses]);

  const fail = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnded(true);
    setFailed(true);
    playWrong();
  }, []);

  useEffect(() => {
    if (!isActive) return;
    setStageIdx(0);
    stageIdxRef.current = 0;
    setHits(0);
    setLit(null);
    litRef.current = null;
    setMisses(0);
    setEnded(false);
    setFailed(false);
    endedRef.current = false;
    hitThisLitRef.current = false;
    setPulse(0);
  }, [isActive, runId]);

  // 亮灯循环
  useEffect(() => {
    if (!isActive || gameplayPaused || ended || failed) return;
    const cur = STAGES[stageIdx];
    let alive = true;

    const lightOne = () => {
      if (!alive || endedRef.current) return;
      // 上一盏未点算失误
      if (litRef.current !== null && !hitThisLitRef.current) {
        setMisses((m) => {
          const nm = m + 1;
          if (nm >= MAX_MISS) fail();
          return nm;
        });
        playWrong();
      }
      if (endedRef.current) return;

      let next = Math.floor(Math.random() * CELL_COUNT);
      if (litRef.current !== null && CELL_COUNT > 1) {
        while (next === litRef.current) next = Math.floor(Math.random() * CELL_COUNT);
      }
      litRef.current = next;
      hitThisLitRef.current = false;
      setLit(next);
      setPulse((p) => p + 1);

      window.setTimeout(() => {
        if (!alive || endedRef.current) return;
        if (litRef.current === next && !hitThisLitRef.current) {
          // 超时熄灭，下一轮 lightOne 会记失误
          setLit(null);
        }
      }, cur.litMs);
    };

    lightOne();
    const timer = window.setInterval(lightOne, cur.intervalMs);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [isActive, gameplayPaused, ended, failed, stageIdx, fail]);

  const tap = (idx: number) => {
    if (!isActive || gameplayPaused || ended || failed) return;
    if (litRef.current === idx && !hitThisLitRef.current) {
      hitThisLitRef.current = true;
      playSwipe();
      playCorrect();
      setLit(null);
      litRef.current = null;
      setHits((h) => {
        const nh = h + 1;
        const need = STAGES[stageIdxRef.current].hitsNeeded;
        if (nh >= need) {
          if (stageIdxRef.current + 1 >= STAGES.length) {
            succeed();
          } else {
            playPop();
            const ns = stageIdxRef.current + 1;
            stageIdxRef.current = ns;
            setStageIdx(ns);
            return 0;
          }
        }
        return nh;
      });
    } else {
      playWrong();
      setMisses((m) => {
        const nm = m + 1;
        if (nm >= MAX_MISS) fail();
        return nm;
      });
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col overflow-hidden" style={{ background: FRESH.bgGrad }}>
      <LevelTopBar
        title={`⚡ 闪光反应 · ${stage.label}`}
        onPause={() => setGameplayPaused(true)}
        hint="灯亮就快点！点错或漏点都会失误"
        stats={[
          { label: '阶段', value: `${stageIdx + 1}/${STAGES.length}` },
          { label: '命中', value: `${hits}/${stage.hitsNeeded}` },
          { label: '失误', value: `${misses}/${MAX_MISS}` }
        ]}
      />

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-6">
<div className="grid grid-cols-2 gap-4">
          {Array.from({ length: CELL_COUNT }, (_, i) => {
            const on = lit === i;
            return (
              <button
                key={`${i}-${pulse}`}
                type="button"
                onClick={() => tap(i)}
                className="w-36 h-36 rounded-3xl border-4 border-white/80 shadow-lg active:scale-95 transition-transform"
                style={{
                  background: on
                    ? `linear-gradient(145deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]})`
                    : 'rgba(255,255,255,0.55)',
                  boxShadow: on ? `0 0 36px ${PALETTE[i % PALETTE.length]}99` : undefined,
                  transform: on ? 'scale(1.06)' : undefined
                }}
              />
            );
          })}
        </div>
        <p className="text-xs text-[#5a7a92]">当前：{stage.label}</p>
      </div>

      {failed && (
        <div className="absolute inset-0 z-[90] bg-[#0a1628]/35 flex items-center justify-center px-10">
          <div className="w-full rounded-3xl bg-white p-6 text-center space-y-3">
            <h3 className="text-lg font-bold">反应慢了半拍</h3>
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
