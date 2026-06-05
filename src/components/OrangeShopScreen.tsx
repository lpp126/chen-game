import React from 'react';
import { useGameStore } from '../store/gameStore';
import { FRESH, failBtnPrimary } from '../utils/levelTheme';

export const OrangeShopScreen: React.FC = () => {
  const { status, goLevelSelect, saveData } = useGameStore();
  if (status !== 'orange_shop') return null;

  return (
    <div
      className="absolute inset-0 z-50 pointer-events-auto flex flex-col items-center justify-center p-8 text-center"
      style={{ background: FRESH.bgGrad }}
    >
      <div
        className="w-48 h-48 rounded-full flex items-center justify-center mb-6 text-6xl border border-white/70 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${FRESH.accentSoft}, white)` }}
      >
        🍊
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: FRESH.text }}>橙子总览</h2>
      <p className="mb-3" style={{ color: FRESH.textMuted }}>橙子数由各关结算星级直接换算。</p>
      <p className="font-bold mb-8" style={{ color: FRESH.text }}>当前累计：🍊 {saveData.totalOranges}</p>
      <button onClick={goLevelSelect} className={`px-8 py-3 rounded-full font-bold ${failBtnPrimary}`}>
        返回
      </button>
    </div>
  );
};
