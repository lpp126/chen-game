import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const HomeScreen: React.FC = () => {
  const { status, goLevelSelect, showAdminLogin, showAdminLoginModal, loginAdmin } = useGameStore();
  const timerRef = useRef<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (status !== 'home') return null;

  const startPress = () => {
    timerRef.current = window.setTimeout(() => {
      showAdminLoginModal(true);
    }, 3000);
  };

  const endPress = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleLogin = () => {
    if (!loginAdmin(username, password)) {
      setError('账号或密码错误');
      return;
    }
    setError('');
    setUsername('');
    setPassword('');
    window.alert('管理员模式已开启');
  };

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
      <div
        className="relative z-10 w-full text-center pb-6 mt-12 flex flex-col gap-2"
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      >
        <p className="text-[#4A4443]/70 text-sm font-medium">陈添祥24周岁生日应援游戏</p>
        <p className="text-[#4A4443]/50 text-xs">Copyright ©添_星辉 | 陈添祥</p>
      </div>

      {showAdminLogin && (
        <div className="absolute inset-0 z-[60] bg-black/40 flex items-center justify-center px-10">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-[20rem]">
            <h3 className="text-lg font-bold text-[#4A4443] mb-4 text-center">管理员登录</h3>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="账号"
              className="w-full border border-[#FADCD9] rounded-xl px-3 py-2 mb-3 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full border border-[#FADCD9] rounded-xl px-3 py-2 mb-2 text-sm"
            />
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleLogin} className="flex-1 bg-[#FADCD9] text-white rounded-xl py-2 text-sm font-semibold">
                登录
              </button>
              <button onClick={() => showAdminLoginModal(false)} className="flex-1 border border-gray-200 text-[#4A4443] rounded-xl py-2 text-sm font-semibold">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
