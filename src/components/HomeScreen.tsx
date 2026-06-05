import React, { useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

const HOME_COVER = '/images/封面.png';

/** 封面图 942×1670，「开始游戏」约在距底 17%～28% 区域 */
const START_BTN_STYLE: React.CSSProperties = {
  left: '14%',
  right: '14%',
  bottom: '17.3%',
  height: '11%'
};

export const HomeScreen: React.FC = () => {
  const { status, goLevelSelect, showAdminLogin, showAdminLoginModal, loginAdmin, saveData } = useGameStore();
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

  const enterGame = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goLevelSelect();
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto overflow-hidden bg-[#0a1628]">
      <img src={HOME_COVER} alt="24帧人生" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none" draggable={false} />

      {/* 封面「开始游戏」热区（下移对齐 hex 按钮） */}
      <button
        type="button"
        onClick={enterGame}
        className="absolute z-30 cursor-pointer touch-manipulation border-0 p-0 m-0 bg-transparent"
        style={START_BTN_STYLE}
        aria-label="开始游戏"
      />

      <div className="absolute right-3 top-3 z-20 px-2.5 py-1 rounded-full bg-black/25 text-white text-xs font-medium backdrop-blur-sm pointer-events-none">
        🍊 {saveData.totalOranges}
      </div>

      {/* 仅最底边长按进管理员，避免挡住开始游戏 */}
      <div
        className="absolute inset-x-0 bottom-0 h-[5%] z-10"
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      />

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
