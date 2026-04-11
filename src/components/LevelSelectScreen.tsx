import React from 'react';
import { useGameStore } from '../store/gameStore';

export const LevelSelectScreen: React.FC = () => {
  const { status, goStartScreen, goHome } = useGameStore();

  if (status !== 'level_select') return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] flex flex-col items-center p-8 pointer-events-auto overflow-y-auto">
      {/* 顶部导航 */}
      <div className="w-full flex items-center justify-between mb-12">
        <button 
          onClick={goHome}
          className="p-2 rounded-full bg-white/60 text-[#4A4443] shadow-sm active:scale-95 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[#4A4443]">主页</h2>
        <div className="w-10"></div> {/* 占位以居中标题 */}
      </div>

      <h1 className="text-3xl font-extrabold text-[#B2CEE5] mb-12 drop-shadow-sm text-center">
        闯关进度
      </h1>
      
      {/* 关卡列表 */}
      <div className="w-full max-w-sm space-y-6">
        
        {/* 第一关（已解锁） */}
        <div 
          onClick={goStartScreen}
          className="relative bg-white p-6 rounded-3xl shadow-xl flex flex-col gap-4 border-2 border-[#FADCD9] cursor-pointer transform active:scale-[0.98] transition-all hover:shadow-2xl overflow-hidden group"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#FADCD9]/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex justify-between items-center relative z-10">
            <h3 className="text-2xl font-bold text-[#4A4443]">第一关</h3>
            <span className="text-[#FADCD9] font-bold bg-[#FADCD9]/10 px-3 py-1 rounded-full text-sm">已解锁</span>
          </div>
          <div className="relative z-10">
            <p className="text-[#B2CEE5] font-medium text-lg">一周岁的添添</p>
            <p className="text-[#4A4443]/60 text-sm mt-1">听，奶瓶里的摇篮曲</p>
          </div>
          <div className="flex gap-1 mt-2 relative z-10">
             {/* 默认3个空心星星，如果是通过后的数据也可以展示，目前暂无历史进度持久化，仅占位 */}
             {[1, 2, 3].map((star) => (
               <svg key={star} className="w-6 h-6 text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
               </svg>
             ))}
          </div>
        </div>

        {/* 第二关（未解锁占位） */}
        <div className="relative bg-white/60 p-6 rounded-3xl shadow-sm flex flex-col gap-4 border-2 border-gray-100 opacity-60">
          <div className="flex justify-between items-center relative z-10">
            <h3 className="text-2xl font-bold text-[#4A4443]/50">第二关</h3>
            <span className="text-gray-400 font-bold bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              未解锁
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-gray-400 font-medium text-lg">敬请期待</p>
            <p className="text-gray-300 text-sm mt-1">更多应援关卡筹备中...</p>
          </div>
        </div>

      </div>
    </div>
  );
};
