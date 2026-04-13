import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';

export const LevelSelectScreen: React.FC = () => {
  const {
    status,
    saveData,
    adminMode,
    goHome,
    goOrangeShop,
    enterLevelStart,
    unlockAllLevels,
    resetCurrentModeData,
    logoutAdmin,
    syncAdminToPlayer
  } = useGameStore();

  if (status !== 'level_select') return null;

  const completedCount = Object.values(saveData.levels).filter((item) => item.completed).length;
  const continueLevel = LEVELS.find((level) => !saveData.levels[String(level.levelId)]?.completed)?.levelId ?? 24;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] flex flex-col items-center p-8 pointer-events-auto overflow-y-auto">
      <div className="w-full flex items-center justify-between mb-4">
        <button 
          onClick={goHome}
          className="p-2 rounded-full bg-white/60 text-[#4A4443] shadow-sm active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[#4A4443]">24帧·人生放映厅</h2>
        <button onClick={goOrangeShop} className="text-[#4A4443] font-bold text-sm bg-white/70 px-2 py-1 rounded-full">
          🍊 {saveData.totalOranges}
        </button>
      </div>

      <div className="w-full bg-white/70 rounded-2xl p-3 mb-4 text-center text-sm text-[#4A4443] font-medium">
        已通关 {completedCount} / 24 关
      </div>

      {adminMode && (
        <div className="w-full bg-red-100 text-red-600 rounded-2xl p-2 mb-4 text-center font-semibold text-sm">
          🔧 管理员模式
        </div>
      )}

      <div className="w-full max-w-[22rem] grid grid-cols-2 gap-3 pb-24">
        {LEVELS.map((level) => {
          const unlocked = adminMode || saveData.unlockedLevels.includes(level.levelId);
          const rec = saveData.levels[String(level.levelId)];
          return (
            <button
              key={level.levelId}
              disabled={!unlocked}
              onClick={() => enterLevelStart(level.levelId)}
              className={`text-left p-4 rounded-2xl border ${unlocked ? 'bg-white border-[#FADCD9] shadow' : 'bg-gray-100 border-gray-200 opacity-60'} `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#4A4443]">{level.levelId}岁</span>
                <span className="text-xs">{unlocked ? '可进入' : '🔒'}</span>
              </div>
              <p className="text-xs text-[#4A4443] mb-2">{level.title}</p>
              <p className="text-xs text-[#4A4443]/60">★ {rec?.stars ?? 0} / 🍊 {rec?.bestOrange ?? 0}</p>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => enterLevelStart(continueLevel)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white px-8 py-3 rounded-full font-bold shadow-lg"
      >
        继续旅程
      </button>

      {adminMode && (
        <div className="fixed right-4 bottom-24 bg-white rounded-2xl shadow-xl border border-red-100 p-3 w-40 space-y-2">
          <button onClick={unlockAllLevels} className="w-full text-xs bg-red-50 rounded-lg py-2">全部解锁</button>
          <button onClick={resetCurrentModeData} className="w-full text-xs bg-red-50 rounded-lg py-2">重置所有进度</button>
          <button onClick={syncAdminToPlayer} className="w-full text-xs bg-red-50 rounded-lg py-2">同步到普通存档</button>
          <button onClick={logoutAdmin} className="w-full text-xs bg-gray-100 rounded-lg py-2">退出管理员</button>
        </div>
      )}
    </div>
  );
};
