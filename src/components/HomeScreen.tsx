import React from 'react';
import { useGameStore } from '../store/gameStore';

export const HomeScreen: React.FC = () => {
  const { status, goLevelSelect } = useGameStore();

  if (status !== 'home') return null;

  return (
    <div className="absolute inset-0 z-50 bg-[#F9F6F0] flex flex-col items-center justify-center p-8 pointer-events-auto bg-cover bg-center" style={{ backgroundImage: 'url(https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_65bcd67e-df05-473b-8f3f-d000739cbea5.jpg)' }}>
      <div className="absolute inset-0 bg-[#F9F6F0]/80 backdrop-blur-sm"></div>
      
      {/* 居中大字标题 */}
      <h1 className="relative z-10 text-[#4A4443] mb-10 text-center drop-shadow-md tracking-wider flex flex-col gap-3">
        <span className="text-[1.75rem] font-extrabold whitespace-nowrap leading-none">陈添祥的平行世界：</span>
        <span className="text-[3.25rem] font-extrabold text-[#B2CEE5] leading-none">24帧人生</span>
      </h1>
      
      <div className="relative z-10 w-full max-w-[14rem] aspect-square rounded-full mb-12 flex flex-col items-center justify-center border-4 border-[#FADCD9] shadow-2xl overflow-hidden shrink-0">
        <img src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_71772a2c-a3d1-4dba-a86d-741fd76c6976.jpg" alt="陈添祥 元素" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FADCD9]/20"></div>
      </div>

      <button 
        onClick={goLevelSelect}
        className="relative z-10 px-12 py-4 mb-auto bg-gradient-to-r from-[#FADCD9] to-[#B2CEE5] text-white rounded-full text-2xl font-bold shadow-xl transform active:scale-95 transition-all hover:opacity-90 hover:shadow-2xl"
      >
        进入游戏
      </button>

      {/* 底部版权和说明 */}
      <div className="relative z-10 w-full text-center pb-6 mt-12 flex flex-col gap-2">
        <p className="text-[#4A4443]/70 text-sm font-medium">陈添祥24周岁生日应援游戏</p>
        <p className="text-[#4A4443]/50 text-xs">Copyright ©添_星辉 | 陈添祥</p>
      </div>
    </div>
  );
};
