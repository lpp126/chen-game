import React from 'react';
import { useGameStore } from '../store/gameStore';

export const OrangeShopScreen: React.FC = () => {
  const { status, goLevelSelect } = useGameStore();
  if (status !== 'orange_shop') return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] pointer-events-auto flex flex-col items-center justify-center p-8 text-center">
      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center mb-6 text-6xl">
        🍊
      </div>
      <h2 className="text-2xl font-bold text-[#4A4443] mb-2">橙子小铺</h2>
      <p className="text-[#4A4443]/70 mb-8">橙子小铺正在装修，敬请期待～</p>
      <button onClick={goLevelSelect} className="px-8 py-3 rounded-full bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white font-bold">
        返回
      </button>
    </div>
  );
};
