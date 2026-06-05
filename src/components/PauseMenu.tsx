import React from 'react';
import { FRESH, mobileTextMin, mobileTextTitle, pauseBtnPrimary, pauseBtnSecondary, pauseOverlay, pausePanel } from '../utils/levelTheme';

interface PauseMenuProps {
  adminMode: boolean;
  onContinue: () => void;
  onRestart: () => void;
  onGoHome: () => void;
  onAdminComplete?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  adminMode,
  onContinue,
  onRestart,
  onGoHome,
  onAdminComplete
}) => (
  <div className={pauseOverlay}>
    <div className={pausePanel}>
      <h3 className={`text-center ${mobileTextTitle} font-bold mb-1`} style={{ color: FRESH.text }}>
        游戏暂停
      </h3>
      <p className={`text-center ${mobileTextMin} mb-4`} style={{ color: FRESH.textMuted }}>
        休息一下，准备好了再继续
      </p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={onContinue}
          className={pauseBtnPrimary}
          style={{ background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` }}
        >
          继续游戏
        </button>
        <button type="button" onClick={onRestart} className={pauseBtnSecondary}>
          重新开始
        </button>
        <button type="button" onClick={onGoHome} className={pauseBtnSecondary}>
          返回选关
        </button>
        {adminMode && onAdminComplete && (
          <button
            type="button"
            onClick={onAdminComplete}
            className={`w-full py-2.5 rounded-2xl ${mobileTextMin} font-semibold active:scale-[0.98]`}
            style={{ color: FRESH.text, background: FRESH.accentSoft, border: `1px solid ${FRESH.mist}88` }}
          >
            测试通关
          </button>
        )}
      </div>
    </div>
  </div>
);
