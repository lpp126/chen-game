import React, { useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LevelTopBar } from './LevelTopBar';
import { FRESH, DESIGN_HEIGHT } from '../utils/levelTheme';

export const HUD: React.FC = () => {
  const {
    status,
    currentLevelId,
    fullness,
    combo,
    adminMode,
    restartCurrentLevel,
    testCompleteLevel,
    setGameplayPaused,
    setLevel1HudHeight
  } = useGameStore();
  const [showAdminTools, setShowAdminTools] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el || status !== 'playing' || currentLevelId !== 1) return;

    const report = () => {
      const gameFrame = el.parentElement;
      if (!gameFrame) return;
      const frameRect = gameFrame.getBoundingClientRect();
      const hudRect = el.getBoundingClientRect();
      const scale = frameRect.height / DESIGN_HEIGHT;
      const designHeight = scale > 0 ? Math.ceil(hudRect.height / scale) : Math.ceil(hudRect.height);
      if (designHeight > 0) setLevel1HudHeight(designHeight);
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, currentLevelId, combo, fullness, setLevel1HudHeight]);

  if (status !== 'playing' || currentLevelId !== 1) return null;

  const stats = combo > 1 ? [{ label: '连击', value: String(combo) }] : [];

  return (
    <div ref={headerRef} className="absolute inset-x-0 top-0 z-40 pointer-events-none flex flex-col">
      <LevelTopBar
        variant="minimal"
        title="🍼 听，奶瓶里的摇篮曲"
        stats={stats}
        onPause={() => setGameplayPaused(true)}
        extra={
          <div
            className="relative w-full rounded-full h-7 overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.28)', border: `2px solid ${FRESH.mist}66` }}
          >
            <div
              className="absolute left-0 h-full transition-all duration-300 ease-out"
              style={{ width: `${fullness}%`, background: `linear-gradient(90deg, ${FRESH.sky}, ${FRESH.sage})` }}
            />
            <span className="relative z-10 text-sm font-bold" style={{ color: FRESH.text }}>饱食度 {Math.floor(fullness)}%</span>
          </div>
        }
      />

      {adminMode && (
        <div className="absolute right-4 top-36 pointer-events-auto">
          <button onClick={() => setShowAdminTools((v) => !v)} className="px-3 py-2 bg-black/30 text-white rounded-full text-xs">
            测试
          </button>
          {showAdminTools && (
            <div className="mt-2 w-28 bg-white rounded-xl p-2 shadow space-y-1">
              <button onClick={testCompleteLevel} className="w-full text-xs bg-red-50 rounded py-1">
                直接通关
              </button>
              <button onClick={restartCurrentLevel} className="w-full text-xs bg-gray-50 rounded py-1">
                重置本关
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
