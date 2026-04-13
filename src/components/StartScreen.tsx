import React from 'react';
import { useGameStore } from '../store/gameStore';
import { LEVELS } from '../data/levels';

export const StartScreen: React.FC = () => {
  const { status, startGame, goLevelSelect, currentLevelId, saveData } = useGameStore();

  if (status !== 'start') return null;
  const level = LEVELS.find((item) => item.levelId === currentLevelId) ?? LEVELS[0];
  const best = saveData.levels[String(level.levelId)]?.stars ?? 0;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] flex flex-col items-center justify-center p-8 pointer-events-auto bg-cover bg-center" style={{ backgroundImage: 'url(https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg)' }}>
      <div className="absolute inset-0 bg-[#F9F6F0]/80 backdrop-blur-sm"></div>
      
      {/* 顶部返回按钮 */}
      <button 
        onClick={goLevelSelect}
        className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/60 text-[#4A4443] shadow-sm active:scale-95 transition-all"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="relative z-10 w-full max-w-[11rem] aspect-square rounded-full mb-6 flex flex-col items-center justify-center border-4 border-[#FADCD9] shadow-2xl overflow-hidden shrink-0">
        <img src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_71772a2c-a3d1-4dba-a86d-741fd76c6976.jpg" alt="陈添祥 我们 封面" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FADCD9]/30"></div>
        {/* Decorative Bottles Overlay */}
        <div className="flex gap-4 relative z-20">
          <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png" alt="奶瓶" className="w-10 h-auto filter drop-shadow-md opacity-90" />
          <img src="https://miaoda-conversation-file.cdn.bcebos.com/user-avwkn2g7m9ds/conv-avx47of1d0cg/20260411/file-avxqgb6iqjnk.png" alt="奶瓶" className="w-10 h-auto filter drop-shadow-md opacity-90" />
        </div>
      </div>
      
      <h1 className="relative z-10 text-3xl font-bold text-[#4A4443] mb-2 text-center drop-shadow-md">
        第{level.levelId}关：<br/>{level.age}岁
      </h1>
      <h2 className="relative z-10 text-lg font-medium text-[#B2CEE5] mb-4 text-center drop-shadow-sm">
        {level.title}
      </h2>
      <p className="relative z-10 text-sm text-[#4A4443]/70 mb-2">历史最佳：{best} 星</p>
      
      <div className="relative z-10 bg-white/70 backdrop-blur-sm p-3 rounded-2xl shadow-sm mb-6 w-full max-w-[18rem] text-[#4A4443] text-xs leading-relaxed border border-[#FADCD9]/50">
        <h3 className="font-bold text-center text-[#B2CEE5] mb-1.5 text-sm">游戏规则</h3>
        <ul className="space-y-1.5">
          {level.levelId === 1 ? (
            <>
              <li className="flex items-start gap-2"><span>🎵</span><span>随节拍点击左右区域，喂饱添添。</span></li>
              <li className="flex items-start gap-2"><span>💧</span><span>收集蓝色奶滴会触发粉色奶泡进入任务槽。</span></li>
              <li className="flex items-start gap-2"><span>🍊</span><span>每累计 10 个粉色奶泡奖励 1 个橙子。</span></li>
              <li className="flex items-start gap-2"><span>🍼</span><span>饱食度到 100% 即通关，失误不会触发安抚中断。</span></li>
            </>
          ) : level.levelId === 2 ? (
            <>
              <li className="flex items-start gap-2"><span>🧭</span><span>点击可通行地面，宝宝自动按最短路径爬行。</span></li>
              <li className="flex items-start gap-2"><span>⭐</span><span>收集6颗勇气星芒，90秒内通关可获3星。</span></li>
              <li className="flex items-start gap-2"><span>🍊</span><span>首次通过3座学步桥各奖励1个橙子。</span></li>
              <li className="flex items-start gap-2"><span>⬆️</span><span>抵达出口后上滑完成站立，进入结算。</span></li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2"><span>🧩</span><span>当前为框架占位玩法，点击推进进度。</span></li>
              <li className="flex items-start gap-2"><span>🍊</span><span>橙子来自本关额外小任务，非直接掉落。</span></li>
              <li className="flex items-start gap-2"><span>✅</span><span>进度达到100%进入结算。</span></li>
            </>
          )}
        </ul>
      </div>

      <button 
        onClick={startGame}
        className="relative z-10 px-10 py-3 bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-xl font-bold shadow-xl transform active:scale-95 transition-all hover:opacity-90 hover:shadow-2xl"
      >
        开始游戏
      </button>
    </div>
  );
};