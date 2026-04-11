import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const GameOver: React.FC = () => {
  const { status, stats, stars, goLevelSelect } = useGameStore();
  const [showToast, setShowToast] = useState(false);

  if (status !== 'gameover') return null;

  const hitRate = stats.total > 0 ? ((stats.perfect + stats.good) / stats.total) * 100 : 0;

  const handleNextLevel = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0]/95 flex flex-col items-center justify-center p-8 pointer-events-auto backdrop-blur-sm">
      <h1 className="text-4xl font-bold text-[#4A4443] mb-8">添添喝饱啦！</h1>

      {/* 星星展示 */}
      <div className="flex gap-4 mb-8">
        {[1, 2, 3].map((star) => (
          <div 
            key={star} 
            className={`w-16 h-16 transform ${star === 2 ? '-translate-y-4' : ''} flex items-center justify-center rounded-full ${
              stars >= star ? 'bg-[#FADCD9] text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'
            } transition-all duration-500`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 mb-12">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <span className="text-[#4A4443]/70 font-medium">节拍准确率</span>
          <span className="text-xl font-bold text-[#4A4443]">{hitRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <span className="text-[#4A4443]/70 font-medium">呛奶次数</span>
          <span className="text-xl font-bold text-[#4A4443]">{stats.oops} 次</span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <span className="text-[#4A4443]/70 font-medium">获得橙子</span>
          <div className="flex items-center gap-1 text-xl font-bold text-[#4A4443]">
            <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avybfccaefi8.jpg" alt="橙子" className="w-6 h-6 rounded-full object-cover inline" />
            <span>× {useGameStore.getState().oranges}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#4A4443]/70 font-medium">安抚次数</span>
          <span className="text-xl font-bold text-[#4A4443]">{stats.sootheCount} 次</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[16rem]">
        <button 
          onClick={handleNextLevel}
          className="w-full py-4 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-xl font-bold shadow-lg transform active:scale-95 transition-all hover:opacity-90"
        >
          下一关
        </button>
        <button 
          onClick={goLevelSelect}
          className="w-full py-4 bg-white text-[#4A4443] border-2 border-[#FADCD9]/50 rounded-full text-xl font-bold shadow-sm transform active:scale-95 transition-all hover:bg-gray-50"
        >
          返回主页
        </button>
      </div>

      {showToast && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-3 rounded-full text-base font-medium shadow-2xl z-50 animate-bounce">
          下一关暂未开放
        </div>
      )}
    </div>
  );
};