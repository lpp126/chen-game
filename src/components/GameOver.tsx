import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';
import { getSettlementImage } from '../data/levelSettlementImages';
import { FRESH, failBtnPrimary, failBtnSecondary } from '../utils/levelTheme';

export const GameOver: React.FC = () => {
  const { status, stars, goLevelSelect, restartCurrentLevel, goNextLevel, currentLevelId, saveData, adminMode } = useGameStore();

  if (status !== 'gameover') return null;

  const isLast = currentLevelId >= LEVELS.length;
  const settlementImage = getSettlementImage(currentLevelId);

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto backdrop-blur-sm overflow-y-auto"
      style={{ background: `${FRESH.bg}f2` }}
    >
      <div className="min-h-full flex flex-col items-center justify-start px-5 py-6">
      <h1 className="text-3xl font-bold mb-5" style={{ color: FRESH.text }}>通关成功！</h1>

      <div className="flex gap-3 mb-5">
        {[1, 2, 3].map((orange) => (
          <div 
            key={orange} 
            className={`w-12 h-12 transform ${orange === 2 ? '-translate-y-2' : ''} flex items-center justify-center rounded-full transition-all duration-500 ${
              stars >= orange ? 'text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'
            }`}
            style={stars >= orange ? { background: `linear-gradient(135deg, ${FRESH.sky}, ${FRESH.sage})` } : undefined}
          >
            <span className="text-2xl">🍊</span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm mb-6 flex justify-center">
        {settlementImage ? (
          <img
            src={settlementImage}
            alt={`第${currentLevelId}关结算`}
            className="w-44 h-44 object-contain drop-shadow-md"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="w-36 h-36 rounded-2xl border-2 border-dashed bg-white/60 flex items-center justify-center text-center px-3 text-xs"
            style={{ borderColor: `${FRESH.mist}88`, color: `${FRESH.text}99` }}
          >
            🎉
          </div>
        )}
      </div>

      <div className="bg-white/90 rounded-3xl p-4 w-full max-w-sm shadow-xl space-y-3 mb-6 border border-white/80">
        <div className="flex justify-between items-center pb-4 border-b border-white/60">
          <span className="font-medium" style={{ color: FRESH.textMuted }}>本关橙子</span>
          <span className="text-lg font-bold" style={{ color: FRESH.text }}>🍊 {stars}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium" style={{ color: FRESH.textMuted }}>累计总橙子</span>
          <span className="text-lg font-bold" style={{ color: FRESH.text }}>🍊 {saveData.totalOranges}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[16rem] pb-3">
        <button 
          onClick={restartCurrentLevel}
          className={`w-full py-3 rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90 ${failBtnPrimary}`}
        >
          再玩一次
        </button>
        <button 
          onClick={isLast ? goLevelSelect : goNextLevel}
          className={`w-full py-3 rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90 ${failBtnPrimary}`}
        >
          {isLast ? '返回主页' : '下一关'}
        </button>
        <button 
          onClick={goLevelSelect}
          className={`w-full py-3 rounded-full text-lg font-bold shadow-sm transform active:scale-95 transition-all ${failBtnSecondary}`}
        >
          返回主页
        </button>
      </div>
      {adminMode && <p className="mt-3 text-xs text-red-500">管理员模式下可连续跳关测试</p>}
      </div>
    </div>
  );
};
