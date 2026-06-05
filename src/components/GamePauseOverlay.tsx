import React from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/gameStore';
import { PauseMenu } from './PauseMenu';

/** 全局暂停层：固定在 750×1330 画布中央，24 关共用 */
export const GamePauseOverlay: React.FC = () => {
  const {
    status,
    gameplayPaused,
    adminMode,
    setGameplayPaused,
    restartCurrentLevel,
    goLevelSelect,
    testCompleteLevel
  } = useGameStore();

  const root = typeof document !== 'undefined' ? document.getElementById('pause-root') : null;

  if (status !== 'playing' || !gameplayPaused || !root) return null;

  return createPortal(
    <PauseMenu
      adminMode={adminMode}
      onContinue={() => setGameplayPaused(false)}
      onRestart={restartCurrentLevel}
      onGoHome={goLevelSelect}
      onAdminComplete={testCompleteLevel}
    />,
    root
  );
};
