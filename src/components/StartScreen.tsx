import React from 'react';
import { useGameStore } from '../store/gameStore';

export const StartScreen: React.FC = () => {
  const { status, startGame, goLevelSelect } = useGameStore();

  if (status !== 'start') return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] flex flex-col items-center justify-center p-8 pointer-events-auto bg-cover bg-center" style={{ backgroundImage: 'url(https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg)' }}>
      <div className="absolute inset-0 bg-[#F9F6F0]/80 backdrop-blur-sm"></div>
      
      {/* 顶部返回按钮 */}
      <button 
        onClick={goLevelSelect}
        className="absolute top-8 left-8 z-20 p-2 rounded-full bg-white/60 text-[#4A4443] shadow-sm active:scale-95 transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="relative z-10 w-full max-w-[14rem] aspect-square rounded-full mb-8 flex flex-col items-center justify-center border-4 border-[#FADCD9] shadow-2xl overflow-hidden shrink-0">
        <img src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_71772a2c-a3d1-4dba-a86d-741fd76c6976.jpg" alt="陈添祥 我们 封面" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FADCD9]/30"></div>
        {/* Decorative Bottles Overlay */}
        <div className="flex gap-6 relative z-20">
          <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png" alt="奶瓶" className="w-12 h-auto filter drop-shadow-md opacity-90" />
          <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png" alt="奶瓶" className="w-12 h-auto filter drop-shadow-md opacity-90" />
        </div>
      </div>
      
      <h1 className="relative z-10 text-4xl font-bold text-[#4A4443] mb-2 text-center drop-shadow-md">
        第一关：<br/>一周岁的添添
      </h1>
      <h2 className="relative z-10 text-xl font-medium text-[#B2CEE5] mb-6 text-center drop-shadow-sm">
        听，奶瓶里的摇篮曲
      </h2>
      
      <div className="relative z-10 bg-white/70 backdrop-blur-sm p-4 rounded-2xl shadow-sm mb-8 w-full max-w-sm text-[#4A4443] text-sm leading-relaxed border border-[#FADCD9]/50">
        <h3 className="font-bold text-center text-[#B2CEE5] mb-2 text-base">游戏规则</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2"><span>🎵</span><span>随节拍在音符到达判定线时点击对应奶瓶。</span></li>
          <li className="flex items-start gap-2"><span>🍼</span><span>准确点击可增加饱食度，100%即可通关。</span></li>
          <li className="flex items-start gap-2"><span>😢</span><span>连续错拍3次将触发安抚，需画圈安抚添添。</span></li>
          <li className="flex items-start gap-2"><span>✨</span><span>每收集10个飘出的粉色奶泡，可额外获得一个橙子🍊。</span></li>
        </ul>
      </div>

      <button 
        onClick={startGame}
        className="relative z-10 px-12 py-4 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-2xl font-bold shadow-xl transform active:scale-95 transition-all hover:opacity-90 hover:shadow-2xl"
      >
        开始游戏
      </button>
    </div>
  );
};