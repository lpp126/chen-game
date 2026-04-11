import React from 'react';
import { useGameStore } from '../store/gameStore';

export const HUD: React.FC = () => {
  const { status, fullness, combo, notesCollected, oranges } = useGameStore();

  if (status !== 'playing' && status !== 'soothing') return null;

  return (
    <div className="absolute top-0 left-0 w-full p-4 z-40 pointer-events-none flex flex-col gap-2">
      {/* 饱食度条和橙子 */}
      <div className="flex items-center w-full max-w-sm mx-auto gap-2">
        <div className="relative flex-1 bg-white/50 rounded-full h-6 border-2 border-[#FADCD9] overflow-hidden flex items-center justify-center">
          <div 
            className="absolute left-0 h-full bg-[#FADCD9] transition-all duration-300 ease-out"
            style={{ width: `${fullness}%` }}
          />
          <span className="relative z-10 text-xs font-bold text-[#4A4443]">
            饱食度 {Math.floor(fullness)}%
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white/70 px-3 py-1 rounded-full border border-white shadow-sm shrink-0">
          <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avybfccaefi8.jpg" alt="橙子" className="w-5 h-5 rounded-full object-cover" />
          <span className="text-[#4A4443] font-bold text-sm">{oranges}</span>
        </div>
      </div>

      {/* 数据状态 */}
      <div className="flex justify-between w-full max-w-sm mx-auto px-2">
        <div className="flex items-center gap-1 text-[#4A4443] font-bold bg-white/60 px-3 py-1 rounded-full text-sm">
          <span className="w-3 h-3 rounded-full bg-[#B2CEE5] inline-block" />
          {notesCollected}
        </div>
        <div className="flex items-center text-[#FADCD9] font-bold bg-white/60 px-3 py-1 rounded-full text-sm">
          {combo > 1 ? `${combo} Combo` : ''}
        </div>
      </div>
    </div>
  );
};