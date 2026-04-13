import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';

export const GameOver: React.FC = () => {
  const { status, stars, goLevelSelect, restartCurrentLevel, goNextLevel, currentLevelId, runOranges, saveData, adminMode } = useGameStore();

  if (status !== 'gameover') return null;

  const isLast = currentLevelId >= LEVELS.length;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0]/95 pointer-events-auto backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-start px-5 py-6">
      <h1 className="text-3xl font-bold text-[#4A4443] mb-5">通关成功！</h1>

      {/* 星星展示 */}
      <div className="flex gap-3 mb-5">
        {[1, 2, 3].map((star) => (
          <div 
            key={star} 
            className={`w-12 h-12 transform ${star === 2 ? '-translate-y-2' : ''} flex items-center justify-center rounded-full ${
              stars >= star ? 'bg-[#FADCD9] text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'
            } transition-all duration-500`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm mb-6 flex justify-center">
        <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-[#FADCD9] bg-white/60 flex items-center justify-center text-center px-3 text-xs text-[#4A4443]/60">
          结算表情包占位
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 w-full max-w-sm shadow-xl space-y-3 mb-6">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <span className="text-[#4A4443]/70 font-medium">本关橙子</span>
          <div className="flex items-center gap-1 text-lg font-bold text-[#4A4443]">
            <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avybfccaefi8.jpg" alt="橙子" className="w-6 h-6 rounded-full object-cover inline" />
            <span>{runOranges}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#4A4443]/70 font-medium">累计总橙子</span>
          <span className="text-lg font-bold text-[#4A4443]">🍊 {saveData.totalOranges}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[16rem] pb-3">
        <button 
          onClick={restartCurrentLevel}
          className="w-full py-3 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90"
        >
          再玩一次
        </button>
        <button 
          onClick={isLast ? goLevelSelect : goNextLevel}
          className="w-full py-3 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-lg font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90"
        >
          {isLast ? '返回主页' : '下一关'}
        </button>
        <button 
          onClick={goLevelSelect}
          className="w-full py-3 bg-white text-[#4A4443] border-2 border-[#FADCD9]/50 rounded-full text-lg font-bold shadow-sm transform active:scale-95 transition-all hover:bg-gray-50"
        >
          返回主页
        </button>
      </div>
      {adminMode && <p className="mt-3 text-xs text-red-500">管理员模式下可连续跳关测试</p>}
      </div>
    </div>
  );
};