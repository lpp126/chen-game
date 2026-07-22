import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';

export const PlaceholderLevelGame: React.FC = () => {
  const {
    status,
    currentLevelId,
    gameplayPaused,
    setGameplayPaused,
    placeholderProgress,
    setPlaceholderProgress,
    completeLevel,
    restartCurrentLevel,
    goLevelSelect,
    adminMode,
    testCompleteLevel
  } = useGameStore();

  if (status !== 'playing' || currentLevelId <= LEVELS.length) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col items-center justify-center bg-[#dcecf5]">
      <button
        onClick={() => setGameplayPaused(true)}
        className="absolute right-4 top-4 px-3 py-1 bg-white/85 rounded-full text-xs"
      >
        暂停
      </button>
      <h2 className="text-2xl font-bold text-[#1a3348] mb-2">第{currentLevelId}关 占位玩法</h2>
      <p className="text-sm text-[#1a3348]/70 mb-6">点击下方按钮推进完成度，后续可替换为正式玩法</p>
      <div className="w-64 h-4 bg-white rounded-full overflow-hidden border border-[#7eb8da] mb-4">
        <div className="h-full bg-[#4a9fd8]" style={{ width: `${placeholderProgress}%` }} />
      </div>
      <p className="text-sm mb-6">完成度：{Math.floor(placeholderProgress)}%</p>
      <button
        onClick={() => {
          if (gameplayPaused) return;
          const next = placeholderProgress + 20;
          if (next >= 100) {
            completeLevel({ stars: 2, orangesCollected: 2, orangeTotal: 3 });
            return;
          }
          setPlaceholderProgress(next);
        }}
        className="bg-gradient-to-r from-[#4a9fd8] to-[#3aab8e] text-white px-8 py-3 rounded-full font-bold"
      >
        推进关卡
      </button>
    </div>
  );
};
