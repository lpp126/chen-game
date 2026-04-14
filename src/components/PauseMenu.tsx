import React from 'react';

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
}) => {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 pointer-events-auto flex items-center justify-center">
      <div className="bg-white rounded-2xl p-4 w-56 space-y-2 text-sm">
        <button onClick={onContinue} className="w-full bg-[#FADCD9] text-white py-2 rounded-xl">
          继续游戏
        </button>
        <button onClick={onRestart} className="w-full bg-gray-100 py-2 rounded-xl">
          重新开始
        </button>
        <button onClick={onGoHome} className="w-full bg-gray-100 py-2 rounded-xl">
          返回主页
        </button>
        {adminMode && onAdminComplete && (
          <button onClick={onAdminComplete} className="w-full bg-red-50 py-2 rounded-xl">
            测试通关
          </button>
        )}
      </div>
    </div>
  );
};
